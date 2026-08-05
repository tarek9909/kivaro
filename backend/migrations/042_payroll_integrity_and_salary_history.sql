CREATE TABLE IF NOT EXISTS salesman_salary_rates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id BIGINT UNSIGNED NOT NULL,
  salesman_id BIGINT UNSIGNED NOT NULL,
  monthly_salary DECIMAL(18,4) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_salesman_salary_rate_effective (salesman_id, effective_from),
  KEY idx_salesman_salary_rate_lookup (store_id, salesman_id, effective_from),
  CONSTRAINT fk_salary_rate_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salary_rate_salesman FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_salary_rate_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_salary_rate_nonnegative CHECK (monthly_salary >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO salesman_salary_rates (store_id, salesman_id, monthly_salary, effective_from)
SELECT store_id, id, base_salary, '1900-01-01' FROM salesmen;

-- The historical unique key is also the supporting index for the salesman
-- foreign key, so create a replacement index before changing the uniqueness.
ALTER TABLE salesman_payroll_payments ADD KEY idx_salesman_payroll_salesman (salesman_id);
ALTER TABLE salesman_payroll_payments DROP INDEX uq_salesman_payroll_month;
ALTER TABLE salesman_payroll_payments ADD COLUMN payout_sequence INT UNSIGNED NOT NULL DEFAULT 1 AFTER period_month;
ALTER TABLE salesman_payroll_payments ADD COLUMN payout_kind ENUM('regular','commission_top_up') NOT NULL DEFAULT 'regular' AFTER payout_sequence;
ALTER TABLE salesman_payroll_payments ADD UNIQUE KEY uq_salesman_payroll_payout (salesman_id, period_month, payout_sequence);
ALTER TABLE salesman_payroll_payments ADD KEY idx_salesman_payroll_kind (store_id, period_month, payout_kind);

ALTER TABLE commission_payments ADD COLUMN payroll_payment_id BIGINT UNSIGNED NULL AFTER commission_calculation_id;
ALTER TABLE commission_payments ADD KEY idx_commission_payments_payroll (payroll_payment_id);
ALTER TABLE commission_payments ADD CONSTRAINT fk_commission_payments_payroll FOREIGN KEY (payroll_payment_id) REFERENCES salesman_payroll_payments(id) ON DELETE RESTRICT ON UPDATE CASCADE;
