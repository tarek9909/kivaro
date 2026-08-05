-- Monthly salary payout snapshots. A row represents one immutable salary
-- payment for one salesman and calendar month; approved commissions are
-- linked through their existing commission payment records.

CREATE TABLE IF NOT EXISTS salesman_payroll_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  period_month DATE NOT NULL,
  base_salary_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_amount DECIMAL(18,4) NOT NULL,
  cash_account_id BIGINT UNSIGNED NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash',
  reference_number VARCHAR(150) NULL,
  paid_by BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_salesman_payroll_month (salesman_id, period_month),
  KEY idx_salesman_payroll_store_month (store_id, period_month),
  CONSTRAINT fk_salesman_payroll_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_payroll_salesman FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_payroll_cash_account FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_salesman_payroll_paid_by FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_salesman_payroll_total CHECK (total_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO store_modules (store_id, module_key, enabled)
SELECT id, 'commissions.payroll', 1 FROM stores
ON DUPLICATE KEY UPDATE enabled = VALUES(enabled);
