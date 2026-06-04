ALTER TABLE location_targets ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE sublocation_targets ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE salesman_targets ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE packaging_configurations ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;
ALTER TABLE product_cost_history ADD COLUMN IF NOT EXISTS store_id BIGINT UNSIGNED NULL AFTER id;

UPDATE location_targets lt
JOIN locations l ON l.id = lt.location_id
SET lt.store_id = l.store_id
WHERE lt.store_id IS NULL;

UPDATE sublocation_targets subt
JOIN location_targets lt ON lt.id = subt.location_target_id
SET subt.store_id = lt.store_id
WHERE subt.store_id IS NULL;

UPDATE salesman_targets st
JOIN salesmen s ON s.id = st.salesman_id
SET st.store_id = s.store_id
WHERE st.store_id IS NULL;

ALTER TABLE locations DROP INDEX code;
ALTER TABLE item_categories DROP INDEX code;
ALTER TABLE units DROP INDEX symbol;
ALTER TABLE items DROP INDEX code;
ALTER TABLE item_variants DROP INDEX sku;
ALTER TABLE warehouses DROP INDEX code;
ALTER TABLE purchase_orders DROP INDEX po_number;
ALTER TABLE purchase_receipts DROP INDEX receipt_number;
ALTER TABLE customers DROP INDEX customer_code;
ALTER TABLE dispatch_requests DROP INDEX dispatch_number;
ALTER TABLE dispatch_customers DROP INDEX receipt_number;
ALTER TABLE dispatch_settlements DROP INDEX settlement_number;
ALTER TABLE customer_receipts DROP INDEX receipt_number;

ALTER TABLE locations ADD UNIQUE KEY uq_locations_store_code (store_id, code);
ALTER TABLE item_categories ADD UNIQUE KEY uq_item_categories_store_code (store_id, code);
ALTER TABLE units ADD UNIQUE KEY uq_units_store_symbol (store_id, symbol);
ALTER TABLE items ADD UNIQUE KEY uq_items_store_code (store_id, code);
ALTER TABLE item_variants ADD UNIQUE KEY uq_item_variants_store_sku (store_id, sku);
ALTER TABLE warehouses ADD UNIQUE KEY uq_warehouses_store_code (store_id, code);
ALTER TABLE purchase_orders ADD UNIQUE KEY uq_purchase_orders_store_number (store_id, po_number);
ALTER TABLE purchase_receipts ADD UNIQUE KEY uq_purchase_receipts_store_number (store_id, receipt_number);
ALTER TABLE customers ADD UNIQUE KEY uq_customers_store_code (store_id, customer_code);
ALTER TABLE dispatch_requests ADD UNIQUE KEY uq_dispatch_requests_store_number (store_id, dispatch_number);
ALTER TABLE dispatch_customers ADD UNIQUE KEY uq_dispatch_customers_store_receipt (store_id, receipt_number);
ALTER TABLE dispatch_settlements ADD UNIQUE KEY uq_dispatch_settlements_store_number (store_id, settlement_number);
ALTER TABLE customer_receipts ADD UNIQUE KEY uq_customer_receipts_store_number (store_id, receipt_number);

ALTER TABLE stock_balances ADD INDEX idx_stock_balances_store_variant (store_id, item_variant_id);
ALTER TABLE dispatch_items ADD INDEX idx_dispatch_items_request_variant (dispatch_request_id, item_variant_id);
ALTER TABLE dispatch_settlements ADD INDEX idx_dispatch_settlements_dispatch_status (dispatch_request_id, status);
ALTER TABLE dispatch_settlement_customers ADD INDEX idx_settlement_customers_settlement (dispatch_settlement_id, dispatch_customer_id);
ALTER TABLE customer_debts ADD INDEX idx_customer_debts_status_balance (store_id, customer_id, status, remaining_amount);
ALTER TABLE customer_payment_allocations ADD INDEX idx_payment_allocations_debt (customer_debt_id);
ALTER TABLE supplier_payments ADD INDEX idx_supplier_payments_po (purchase_order_id, payment_date);
ALTER TABLE commission_calculations ADD INDEX idx_commission_calculations_target_status (salesman_target_id, status);
ALTER TABLE commission_payments ADD INDEX idx_commission_payments_calculation (commission_calculation_id);
ALTER TABLE salesman_balances ADD INDEX idx_salesman_balances_status (store_id, salesman_id, status);

CREATE OR REPLACE VIEW v_salesman_target_progress AS
SELECT
    progress.salesman_target_id,
    progress.store_id,
    progress.salesman_id,
    progress.salesman_name,
    progress.location_name,
    progress.sublocation_name,
    progress.target_period,
    progress.period_start,
    progress.period_end,
    progress.target_amount,
    progress.achieved_sales_amount,
    CASE
        WHEN progress.target_amount = 0 THEN 0
        ELSE ROUND((progress.achieved_sales_amount / progress.target_amount) * 100, 2)
    END AS achievement_percentage
FROM (
    SELECT
        st.id AS salesman_target_id,
        st.store_id,
        s.id AS salesman_id,
        s.full_name AS salesman_name,
        l.name AS location_name,
        sl.name AS sublocation_name,
        lt.target_period,
        lt.period_start,
        lt.period_end,
        st.target_amount,
        COALESCE((
            SELECT SUM(
                CASE WHEN di.quantity > 0
                    THEN di.line_total - (di.line_total * di.returned_quantity / di.quantity)
                    ELSE di.line_total
                END
            )
            FROM dispatch_items di
            JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id
            JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
            WHERE dr.salesman_id = st.salesman_id
              AND dr.store_id = st.store_id
              AND dc.sublocation_id = subt.sublocation_id
              AND dr.status = 'completed'
              AND dr.request_date BETWEEN lt.period_start AND lt.period_end
        ), 0) AS achieved_sales_amount
    FROM salesman_targets st
    JOIN salesmen s ON s.id = st.salesman_id
    JOIN sublocation_targets subt ON subt.id = st.sublocation_target_id
    JOIN location_targets lt ON lt.id = subt.location_target_id
    JOIN sublocations sl ON sl.id = subt.sublocation_id
    JOIN locations l ON l.id = sl.location_id
) progress;
