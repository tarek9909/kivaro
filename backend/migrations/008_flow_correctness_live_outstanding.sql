ALTER TABLE purchase_orders
  MODIFY status ENUM('draft','pending','approved','partially_received','received','closed','cancelled') NOT NULL DEFAULT 'draft';

ALTER TABLE customer_debts
  ADD INDEX idx_customer_debts_dispatch_balance (dispatch_request_id, dispatch_customer_id, salesman_id, status, remaining_amount);

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
    dr.total_debt,
    COALESCE(adjustments.debt_adjustment_amount, 0) AS debt_adjustment_amount,
    COALESCE(debts.outstanding_debt_amount, 0) AS outstanding_debt_amount
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
) items ON items.dispatch_request_id = dr.id
LEFT JOIN (
    SELECT dispatch_request_id, COALESCE(SUM(amount), 0) AS debt_adjustment_amount
    FROM customer_debt_adjustments
    GROUP BY dispatch_request_id
) adjustments ON adjustments.dispatch_request_id = dr.id
LEFT JOIN (
    SELECT dispatch_request_id, COALESCE(SUM(remaining_amount), 0) AS outstanding_debt_amount
    FROM customer_debts
    WHERE status IN ('pending', 'partially_paid')
    GROUP BY dispatch_request_id
) debts ON debts.dispatch_request_id = dr.id;
