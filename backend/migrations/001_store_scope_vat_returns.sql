ALTER TABLE locations ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE sublocations ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE salesmen ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE item_categories ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE units ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE items ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE item_variants ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE stock_balances ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE purchase_receipts ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE supplier_payments ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE dispatch_requests ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE dispatch_customers ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE dispatch_settlements ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE dispatch_returns ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE customer_debts ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE customer_payments ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE customer_receipts ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE salesman_balances ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE commission_rules ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE commission_payments ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;

ALTER TABLE dispatch_requests ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER total_quantity;
ALTER TABLE dispatch_requests ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER subtotal_amount;
ALTER TABLE dispatch_customers ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER sublocation_id;
ALTER TABLE dispatch_customers ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER subtotal_amount;
ALTER TABLE dispatch_items ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER unit_cost;
ALTER TABLE dispatch_items ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(9,4) NOT NULL DEFAULT 0 AFTER subtotal_amount;
ALTER TABLE dispatch_items ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER vat_rate;
ALTER TABLE customer_debts ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER debt_date;
ALTER TABLE customer_debts ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER subtotal_amount;
ALTER TABLE customer_receipts ADD COLUMN IF NOT EXISTS subtotal_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER receipt_date;
ALTER TABLE customer_receipts ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER subtotal_amount;

UPDATE dispatch_items SET subtotal_amount = line_total WHERE subtotal_amount = 0;
UPDATE dispatch_requests SET subtotal_amount = total_amount WHERE subtotal_amount = 0;
UPDATE dispatch_customers SET subtotal_amount = customer_total_amount WHERE subtotal_amount = 0;
UPDATE customer_debts SET subtotal_amount = original_amount WHERE subtotal_amount = 0;
UPDATE customer_receipts SET subtotal_amount = total_amount WHERE subtotal_amount = 0;

UPDATE locations SET store_id = 1 WHERE store_id IS NULL;
UPDATE sublocations SET store_id = 1 WHERE store_id IS NULL;
UPDATE salesmen SET store_id = 1 WHERE store_id IS NULL;
UPDATE suppliers SET store_id = 1 WHERE store_id IS NULL;
UPDATE item_categories SET store_id = 1 WHERE store_id IS NULL;
UPDATE units SET store_id = 1 WHERE store_id IS NULL;
UPDATE items SET store_id = 1 WHERE store_id IS NULL;
UPDATE item_variants SET store_id = 1 WHERE store_id IS NULL;
UPDATE warehouses SET store_id = 1 WHERE store_id IS NULL;
UPDATE stock_balances SET store_id = 1 WHERE store_id IS NULL;
UPDATE stock_movements SET store_id = 1 WHERE store_id IS NULL;
UPDATE purchase_orders SET store_id = 1 WHERE store_id IS NULL;
UPDATE purchase_receipts SET store_id = 1 WHERE store_id IS NULL;
UPDATE supplier_payments SET store_id = 1 WHERE store_id IS NULL;
UPDATE customers SET store_id = 1 WHERE store_id IS NULL;
UPDATE dispatch_requests SET store_id = 1 WHERE store_id IS NULL;
UPDATE dispatch_customers SET store_id = 1 WHERE store_id IS NULL;
UPDATE dispatch_settlements SET store_id = 1 WHERE store_id IS NULL;
UPDATE dispatch_returns SET store_id = 1 WHERE store_id IS NULL;
UPDATE customer_debts SET store_id = 1 WHERE store_id IS NULL;
UPDATE customer_payments SET store_id = 1 WHERE store_id IS NULL;
UPDATE customer_receipts SET store_id = 1 WHERE store_id IS NULL;
UPDATE expense_categories SET store_id = 1 WHERE store_id IS NULL;
UPDATE expenses SET store_id = 1 WHERE store_id IS NULL;
UPDATE cash_accounts SET store_id = 1 WHERE store_id IS NULL;
UPDATE financial_transactions SET store_id = 1 WHERE store_id IS NULL;
UPDATE salesman_balances SET store_id = 1 WHERE store_id IS NULL;
UPDATE commission_rules SET store_id = 1 WHERE store_id IS NULL;
UPDATE commission_calculations SET store_id = 1 WHERE store_id IS NULL;
UPDATE commission_payments SET store_id = 1 WHERE store_id IS NULL;
UPDATE audit_logs SET store_id = 1 WHERE store_id IS NULL;
UPDATE notifications SET store_id = 1 WHERE store_id IS NULL;

INSERT INTO system_settings (store_id, setting_key, setting_value, value_type, description)
VALUES
  (1, 'sales.vat.enabled', 'false', 'boolean', 'Enable VAT on new customer sale lines'),
  (1, 'sales.vat.rate', '0', 'number', 'VAT percentage applied to new customer sale lines')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

INSERT INTO permissions (module, action, permission_key, description)
VALUES
  ('vat', 'view', 'vat.view', 'View VAT settings'),
  ('vat', 'manage', 'vat.manage', 'Manage VAT settings')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN ('vat.view', 'vat.manage')
WHERE r.name IN ('owner', 'admin')
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id);

INSERT INTO store_modules (store_id, module_key, enabled)
VALUES (1, 'settings.vat', 1)
ON DUPLICATE KEY UPDATE enabled = VALUES(enabled);

CREATE OR REPLACE VIEW v_current_stock AS
SELECT
    sb.id AS stock_balance_id,
    sb.store_id,
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    i.id AS item_id,
    i.name AS item_name,
    i.item_type,
    iv.id AS item_variant_id,
    iv.variant_name,
    iv.sku,
    u.symbol AS unit_symbol,
    sb.quantity_on_hand,
    sb.quantity_reserved,
    (sb.quantity_on_hand - sb.quantity_reserved) AS quantity_available,
    sb.average_cost,
    (sb.quantity_on_hand * sb.average_cost) AS stock_value
FROM stock_balances sb
JOIN warehouses w ON w.id = sb.warehouse_id
JOIN item_variants iv ON iv.id = sb.item_variant_id
JOIN items i ON i.id = iv.item_id
JOIN units u ON u.id = i.base_unit_id;

CREATE OR REPLACE VIEW v_customer_balances AS
SELECT
    c.id AS customer_id,
    c.store_id,
    c.name AS customer_name,
    l.name AS location_name,
    sl.name AS sublocation_name,
    COALESCE(SUM(cd.subtotal_amount), 0) AS total_debt_subtotal,
    COALESCE(SUM(cd.vat_amount), 0) AS total_debt_vat,
    COALESCE(SUM(cd.original_amount), 0) AS total_debt_created,
    COALESCE(SUM(cd.paid_amount), 0) AS total_debt_paid,
    COALESCE(SUM(cd.remaining_amount), 0) AS total_remaining_debt
FROM customers c
JOIN locations l ON l.id = c.location_id
JOIN sublocations sl ON sl.id = c.sublocation_id
LEFT JOIN customer_debts cd ON cd.customer_id = c.id
    AND cd.status IN ('pending','partially_paid')
GROUP BY c.id, c.store_id, c.name, l.name, sl.name;

CREATE OR REPLACE VIEW v_dispatch_summary AS
SELECT
    dr.id AS dispatch_request_id,
    dr.store_id,
    dr.dispatch_number,
    dr.request_date,
    dr.status,
    s.full_name AS salesman_name,
    w.name AS warehouse_name,
    COUNT(DISTINCT dc.customer_id) AS customers_count,
    dr.total_quantity,
    dr.subtotal_amount,
    dr.vat_amount,
    dr.total_amount,
    COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.subtotal_amount * di.returned_quantity / di.quantity ELSE 0 END), 0) AS returned_subtotal_amount,
    COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.vat_amount * di.returned_quantity / di.quantity ELSE 0 END), 0) AS returned_vat_amount,
    COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.line_total * di.returned_quantity / di.quantity ELSE 0 END), 0) AS returned_total_amount,
    GREATEST(dr.subtotal_amount - COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.subtotal_amount * di.returned_quantity / di.quantity ELSE 0 END), 0), 0) AS net_subtotal_amount,
    GREATEST(dr.vat_amount - COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.vat_amount * di.returned_quantity / di.quantity ELSE 0 END), 0), 0) AS net_vat_amount,
    GREATEST(dr.total_amount - COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.line_total * di.returned_quantity / di.quantity ELSE 0 END), 0), 0) AS net_total_amount,
    dr.total_collected,
    dr.total_debt
FROM dispatch_requests dr
JOIN salesmen s ON s.id = dr.salesman_id
JOIN warehouses w ON w.id = dr.warehouse_id
LEFT JOIN dispatch_customers dc ON dc.dispatch_request_id = dr.id
LEFT JOIN dispatch_items di ON di.dispatch_request_id = dr.id
GROUP BY
    dr.id, dr.store_id, dr.dispatch_number, dr.request_date, dr.status,
    s.full_name, w.name, dr.total_quantity, dr.subtotal_amount, dr.vat_amount,
    dr.total_amount, dr.total_collected, dr.total_debt;
