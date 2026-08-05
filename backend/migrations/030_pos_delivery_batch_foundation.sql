-- Phase 1: POS-led sales and delivery workflow foundation

-- 1. Seed permission keys
INSERT INTO permissions (module, action, permission_key, description)
VALUES
  ('pos', 'create_own', 'pos.create_own', 'Create, edit, and cancel own pending customer requests'),
  ('pos', 'create_for_salesman', 'pos.create_for_salesman', 'Create customer request or batch assigned to another salesman'),
  ('pos', 'manage_pending', 'pos.manage_pending', 'Review, group, adjust, and cancel pending requests and batches'),
  ('dispatch', 'release', 'delivery.release', 'Release a pending delivery batch and lock edits'),
  ('dispatch', 'dispatch', 'delivery.dispatch', 'Execute stock-consuming delivery transition'),
  ('dispatch', 'record_returns', 'delivery.record_returns', 'Record customer and line delivery returns'),
  ('dispatch', 'settle_deliveries', 'finance.settle_deliveries', 'Perform delivery settlement, payment, refund, and debt closeout')
ON DUPLICATE KEY UPDATE
  module = VALUES(module),
  action = VALUES(action),
  description = VALUES(description);

-- Map all permissions to owner role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'pos.create_own',
  'pos.create_for_salesman',
  'pos.manage_pending',
  'delivery.release',
  'delivery.dispatch',
  'delivery.record_returns',
  'finance.settle_deliveries'
)
WHERE r.name = 'owner';

-- Map permissions to store admin role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'pos.create_own',
  'pos.create_for_salesman',
  'pos.manage_pending',
  'delivery.release',
  'delivery.dispatch',
  'delivery.record_returns',
  'finance.settle_deliveries'
)
WHERE r.name = 'admin';

-- Map settlement & return permissions to accountant/finance role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN (
  'finance.settle_deliveries',
  'delivery.record_returns'
)
WHERE r.name IN ('accountant', 'finance');

-- Map pos.create_own to store salesman role if present
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key = 'pos.create_own'
WHERE r.name = 'salesman';

-- 2. Alter dispatch_requests table
ALTER TABLE dispatch_requests
  ADD COLUMN origin ENUM('direct', 'pos_requests') NOT NULL DEFAULT 'direct' AFTER store_id,
  ADD COLUMN lifecycle_status ENUM('pending', 'released', 'out_for_delivery', 'closeout_pending', 'settled', 'cancelled') NOT NULL DEFAULT 'pending' AFTER status,
  ADD KEY idx_dispatch_requests_origin (store_id, origin),
  ADD KEY idx_dispatch_requests_lifecycle (store_id, lifecycle_status);

-- 3. Alter dispatch_customers table
ALTER TABLE dispatch_customers
  ADD COLUMN fulfillment_status ENUM('pending', 'released', 'out_for_delivery', 'delivered', 'partial', 'returned', 'failed') NOT NULL DEFAULT 'pending' AFTER payment_status,
  ADD COLUMN pos_order_id BIGINT UNSIGNED NULL AFTER customer_id,
  ADD KEY idx_dispatch_customers_fulfillment (store_id, fulfillment_status),
  ADD CONSTRAINT fk_dispatch_customers_pos_order
    FOREIGN KEY (pos_order_id) REFERENCES pos_orders(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Target-credit ledger foundation table
CREATE TABLE IF NOT EXISTS delivery_target_credits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  dispatch_request_id BIGINT UNSIGNED NOT NULL,
  dispatch_customer_id BIGINT UNSIGNED NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  eligible_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  reference_date DATE NULL,
  delivery_date DATE NULL,
  status ENUM('pending', 'earned', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delivery_target_credits_salesman_date (store_id, salesman_id, status, reference_date),
  KEY idx_delivery_target_credits_dispatch (dispatch_request_id),
  CONSTRAINT fk_delivery_target_credits_store
    FOREIGN KEY (store_id) REFERENCES stores(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_delivery_target_credits_dispatch
    FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_delivery_target_credits_dispatch_customer
    FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_delivery_target_credits_salesman
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_delivery_target_credits_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Backfill existing data
UPDATE dispatch_requests dr
JOIN pos_order_dispatch_links podl ON podl.dispatch_request_id = dr.id
SET dr.origin = 'pos_requests';

UPDATE dispatch_requests dr
JOIN pos_orders po ON po.dispatch_request_id = dr.id
SET dr.origin = 'pos_requests';

UPDATE dispatch_customers dc
JOIN pos_orders po ON po.dispatch_request_id = dc.dispatch_request_id AND po.customer_id = dc.customer_id
SET dc.pos_order_id = po.id;

UPDATE dispatch_requests
SET lifecycle_status = CASE status
  WHEN 'draft' THEN 'pending'
  WHEN 'pending_approval' THEN 'pending'
  WHEN 'approved' THEN 'released'
  WHEN 'dispatched' THEN 'out_for_delivery'
  WHEN 'partially_settled' THEN 'closeout_pending'
  WHEN 'completed' THEN 'settled'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END;

UPDATE dispatch_customers dc
JOIN dispatch_requests dr ON dr.id = dc.dispatch_request_id
SET dc.fulfillment_status = CASE dr.status
  WHEN 'draft' THEN 'pending'
  WHEN 'pending_approval' THEN 'pending'
  WHEN 'approved' THEN 'released'
  WHEN 'dispatched' THEN 'out_for_delivery'
  WHEN 'partially_settled' THEN 'delivered'
  WHEN 'completed' THEN 'delivered'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END;
