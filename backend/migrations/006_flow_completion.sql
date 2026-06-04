ALTER TABLE purchase_orders MODIFY status ENUM('draft','pending','approved','partially_received','received','cancelled') NOT NULL DEFAULT 'draft';

UPDATE purchase_orders
SET status = 'approved'
WHERE status = 'pending'
  AND approved_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS customer_credits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    direction ENUM('credit','debit') NOT NULL DEFAULT 'credit',
    amount DECIMAL(18,4) NOT NULL,
    source_payment_id BIGINT UNSIGNED NULL,
    customer_debt_id BIGINT UNSIGNED NULL,
    reference_type VARCHAR(80) NULL,
    reference_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_credits_customer (store_id, customer_id, created_at),
    CONSTRAINT fk_customer_credits_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_payment
        FOREIGN KEY (source_payment_id) REFERENCES customer_payments(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_debt
        FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_customer_credits_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_customer_credits_amount CHECK (amount > 0)
) ENGINE=InnoDB;

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

INSERT INTO store_modules (store_id, module_key, enabled)
SELECT 1, 'payments.customer-credits', 1
WHERE NOT EXISTS (
    SELECT 1
    FROM store_modules
    WHERE store_id = 1
      AND module_key = 'payments.customer-credits'
);
