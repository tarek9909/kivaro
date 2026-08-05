ALTER TABLE salesman_payroll_payments ADD COLUMN IF NOT EXISTS salary_proration_days INT UNSIGNED NOT NULL DEFAULT 0 AFTER base_salary_amount;
ALTER TABLE salesman_payroll_payments ADD COLUMN IF NOT EXISTS salary_proration_period_days INT UNSIGNED NOT NULL DEFAULT 0 AFTER salary_proration_days;
ALTER TABLE salesman_payroll_payments ADD COLUMN IF NOT EXISTS salary_proration_policy VARCHAR(40) NOT NULL DEFAULT 'calendar_days' AFTER salary_proration_period_days;
