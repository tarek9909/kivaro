CREATE TABLE IF NOT EXISTS customer_payment_allocations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_payment_id BIGINT UNSIGNED NOT NULL,
  customer_debt_id BIGINT UNSIGNED NOT NULL,
  allocated_amount DECIMAL(18,4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_payment_allocations_payment
    FOREIGN KEY (customer_payment_id) REFERENCES customer_payments(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_customer_payment_allocations_debt
    FOREIGN KEY (customer_debt_id) REFERENCES customer_debts(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_customer_payment_allocations_amount CHECK (allocated_amount > 0)
);
