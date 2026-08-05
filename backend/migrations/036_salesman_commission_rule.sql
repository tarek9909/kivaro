-- A salesman has one reusable commission rule. Calculations keep their own
-- rule reference, so historical payroll remains accurate after reassignment.
ALTER TABLE salesmen
  ADD COLUMN commission_rule_id BIGINT UNSIGNED NULL AFTER base_salary;

ALTER TABLE salesmen
  ADD KEY idx_salesmen_commission_rule (commission_rule_id);

ALTER TABLE salesmen
  ADD CONSTRAINT fk_salesmen_commission_rule
    FOREIGN KEY (commission_rule_id) REFERENCES commission_rules(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
