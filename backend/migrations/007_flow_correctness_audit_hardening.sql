ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cash_account_id BIGINT UNSIGNED NULL AFTER payment_method;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status ENUM('active','voided') NOT NULL DEFAULT 'active' AFTER reference_number;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voided_at DATETIME NULL AFTER status;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS voided_by BIGINT UNSIGNED NULL AFTER voided_at;

UPDATE expenses e
JOIN financial_transactions ft ON ft.reference_type = 'expense'
  AND ft.reference_id = e.id
  AND ft.transaction_type = 'expense'
SET e.cash_account_id = ft.cash_account_id
WHERE e.cash_account_id IS NULL;

CREATE TABLE IF NOT EXISTS customer_debt_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    customer_debt_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    salesman_id BIGINT UNSIGNED NULL,
    dispatch_request_id BIGINT UNSIGNED NULL,
    dispatch_customer_id BIGINT UNSIGNED NULL,
    adjustment_type ENUM('write_off','cancel') NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_debt_adjustments_debt (customer_debt_id),
    INDEX idx_debt_adjustments_dispatch (dispatch_request_id, dispatch_customer_id),
    INDEX idx_debt_adjustments_store_customer (store_id, customer_id),
    CONSTRAINT fk_debt_adjustments_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_debt
        FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_salesman
        FOREIGN KEY (salesman_id) REFERENCES salesmen(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_dispatch
        FOREIGN KEY (dispatch_request_id) REFERENCES dispatch_requests(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_dispatch_customer
        FOREIGN KEY (dispatch_customer_id) REFERENCES dispatch_customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_debt_adjustments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_debt_adjustments_amount CHECK (amount > 0)
) ENGINE=InnoDB;

ALTER TABLE salesman_sublocations ADD INDEX idx_salesman_sublocations_salesman_fk (salesman_id);
ALTER TABLE salesman_sublocations ADD INDEX idx_salesman_sublocations_sublocation_fk (sublocation_id);
ALTER TABLE salesman_sublocations DROP INDEX uq_salesman_active_sublocation;
ALTER TABLE salesman_sublocations ADD COLUMN IF NOT EXISTS active_assignment_key TINYINT
    GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED;
ALTER TABLE salesman_sublocations ADD UNIQUE KEY uq_salesman_active_sublocation
    (salesman_id, sublocation_id, active_assignment_key);

ALTER TABLE salesman_targets ADD INDEX idx_salesman_targets_sublocation_target_fk (sublocation_target_id);
ALTER TABLE salesman_targets ADD INDEX idx_salesman_targets_salesman_fk (salesman_id);
ALTER TABLE salesman_targets DROP INDEX uq_salesman_target_sublocation_target;
ALTER TABLE salesman_targets ADD COLUMN IF NOT EXISTS active_target_key TINYINT
    GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED;
ALTER TABLE salesman_targets ADD UNIQUE KEY uq_salesman_target_sublocation_target
    (sublocation_target_id, salesman_id, active_target_key);

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
    COALESCE(SUM(cd.remaining_amount), 0) AS total_remaining_debt,
    COALESCE(credits.available_credit, 0) AS available_credit,
    GREATEST(COALESCE(SUM(cd.remaining_amount), 0) - COALESCE(credits.available_credit, 0), 0) AS net_customer_balance
FROM customers c
JOIN locations l ON l.id = c.location_id
JOIN sublocations sl ON sl.id = c.sublocation_id
LEFT JOIN customer_debts cd ON cd.customer_id = c.id
    AND cd.status IN ('pending','partially_paid')
LEFT JOIN (
    SELECT
        customer_id,
        store_id,
        COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS available_credit
    FROM customer_credits
    GROUP BY customer_id, store_id
) credits ON credits.customer_id = c.id AND credits.store_id = c.store_id
GROUP BY c.id, c.store_id, c.name, l.name, sl.name, credits.available_credit;

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
    WHERE st.status = 'active'
) progress;

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
    GREATEST(dr.total_debt - COALESCE(adjustments.debt_adjustment_amount, 0), 0) AS outstanding_debt_amount
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
) adjustments ON adjustments.dispatch_request_id = dr.id;
