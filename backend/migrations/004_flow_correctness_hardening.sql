UPDATE roles
SET store_id = 1
WHERE store_id IS NULL
  AND name <> 'superadmin';

ALTER TABLE roles DROP INDEX name;
ALTER TABLE users DROP INDEX username;
ALTER TABLE users DROP INDEX email;

ALTER TABLE roles ADD UNIQUE KEY uq_roles_store_name (store_id, name);
ALTER TABLE users ADD UNIQUE KEY uq_users_store_username (store_id, username);
ALTER TABLE users ADD UNIQUE KEY uq_users_store_email (store_id, email);

ALTER TABLE stock_movements MODIFY movement_type ENUM(
    'purchase_receive',
    'production_consume',
    'production_output',
    'dispatch_reserve',
    'dispatch_unreserve',
    'dispatch_out',
    'dispatch_return',
    'sales_settle',
    'damage',
    'adjustment',
    'transfer_in',
    'transfer_out'
) NOT NULL;

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reserved_quantity_change DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER quantity_after;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reserved_quantity_before DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER reserved_quantity_change;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reserved_quantity_after DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER reserved_quantity_before;

CREATE OR REPLACE VIEW v_dispatch_summary AS
SELECT
    dr.id AS dispatch_request_id,
    dr.store_id,
    dr.dispatch_number,
    dr.request_date,
    dr.status,
    s.full_name AS salesman_name,
    w.name AS warehouse_name,
    COALESCE(customers.customers_count, 0) AS customers_count,
    dr.total_quantity,
    dr.subtotal_amount,
    dr.vat_amount,
    dr.total_amount,
    COALESCE(items.returned_subtotal_amount, 0) AS returned_subtotal_amount,
    COALESCE(items.returned_vat_amount, 0) AS returned_vat_amount,
    COALESCE(items.returned_total_amount, 0) AS returned_total_amount,
    GREATEST(dr.subtotal_amount - COALESCE(items.returned_subtotal_amount, 0), 0) AS net_subtotal_amount,
    GREATEST(dr.vat_amount - COALESCE(items.returned_vat_amount, 0), 0) AS net_vat_amount,
    GREATEST(dr.total_amount - COALESCE(items.returned_total_amount, 0), 0) AS net_total_amount,
    dr.total_collected,
    dr.total_debt
FROM dispatch_requests dr
JOIN salesmen s ON s.id = dr.salesman_id
JOIN warehouses w ON w.id = dr.warehouse_id
LEFT JOIN (
    SELECT dispatch_request_id, COUNT(DISTINCT customer_id) AS customers_count
    FROM dispatch_customers
    GROUP BY dispatch_request_id
) customers ON customers.dispatch_request_id = dr.id
LEFT JOIN (
    SELECT
        dispatch_request_id,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN subtotal_amount * returned_quantity / quantity ELSE 0 END), 0) AS returned_subtotal_amount,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN vat_amount * returned_quantity / quantity ELSE 0 END), 0) AS returned_vat_amount,
        COALESCE(SUM(CASE WHEN quantity > 0 THEN line_total * returned_quantity / quantity ELSE 0 END), 0) AS returned_total_amount
    FROM dispatch_items
    GROUP BY dispatch_request_id
) items ON items.dispatch_request_id = dr.id;
