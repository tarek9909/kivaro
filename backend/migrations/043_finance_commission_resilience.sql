-- Reconcile the cash balance cache with immutable ledger rows.  Accounts
-- without a historical opening entry are backfilled without changing their
-- already-held balance; the final update then makes the cache ledger-derived.
INSERT INTO financial_transactions (
  store_id, cash_account_id, transaction_date, transaction_type, direction, amount,
  reference_type, reference_id, description
)
SELECT ca.store_id, ca.id, ca.created_at, 'opening_balance',
  CASE WHEN ca.opening_balance >= 0 THEN 'in' ELSE 'out' END,
  ABS(ca.opening_balance), 'cash_account', ca.id, 'Historical opening balance backfill'
FROM cash_accounts ca
WHERE ca.opening_balance <> 0
  AND NOT EXISTS (
    SELECT 1 FROM financial_transactions ft
    WHERE ft.cash_account_id = ca.id
      AND ft.transaction_type = 'opening_balance'
      AND ft.reference_type = 'cash_account'
      AND ft.reference_id = ca.id
  );

INSERT INTO audit_logs (store_id, module, action, table_name, record_id, old_values, new_values, description)
SELECT ca.store_id, 'accounting', 'cash_balance_reconciled', 'cash_accounts', ca.id,
  JSON_OBJECT('current_balance', ca.current_balance),
  JSON_OBJECT('current_balance', ledger.ledger_balance),
  'Cash-account cached balance reconciled to immutable ledger history'
FROM cash_accounts ca
JOIN (
  SELECT cash_account_id,
    COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS ledger_balance
  FROM financial_transactions
  WHERE cash_account_id IS NOT NULL
  GROUP BY cash_account_id
) ledger ON ledger.cash_account_id = ca.id
WHERE ca.current_balance <> ledger.ledger_balance;

UPDATE cash_accounts ca
LEFT JOIN (
  SELECT cash_account_id,
    COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0) AS ledger_balance
  FROM financial_transactions
  WHERE cash_account_id IS NOT NULL
  GROUP BY cash_account_id
) ledger ON ledger.cash_account_id = ca.id
SET ca.current_balance = COALESCE(ledger.ledger_balance, 0);

CREATE TABLE IF NOT EXISTS salesman_target_commission_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  salesman_target_id BIGINT UNSIGNED NOT NULL,
  commission_rule_id BIGINT UNSIGNED NULL,
  rule_name VARCHAR(150) NOT NULL,
  below_target_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
  at_target_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
  above_target_extra_rate DECIMAL(9,4) NOT NULL DEFAULT 0,
  captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  historical_backfill TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_target_commission_snapshot (salesman_target_id),
  KEY idx_target_commission_snapshot_rule (commission_rule_id),
  CONSTRAINT fk_target_commission_snapshot_target FOREIGN KEY (salesman_target_id) REFERENCES salesman_targets(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_target_commission_snapshot_rule FOREIGN KEY (commission_rule_id) REFERENCES commission_rules(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO salesman_target_commission_snapshots (
  salesman_target_id, commission_rule_id, rule_name, below_target_rate,
  at_target_rate, above_target_extra_rate, historical_backfill
)
SELECT st.id, cr.id, COALESCE(cr.name, 'Historical rule unavailable'),
  COALESCE(cr.below_target_rate, 0), COALESCE(cr.at_target_rate, 0),
  COALESCE(cr.above_target_extra_rate, 0), 1
FROM salesman_targets st
JOIN salesmen s ON s.id = st.salesman_id
LEFT JOIN commission_rules cr ON cr.id = s.commission_rule_id;

CREATE TABLE IF NOT EXISTS scheduler_heartbeats (
  scheduler_name VARCHAR(100) NOT NULL,
  last_started_at DATETIME NOT NULL,
  last_succeeded_at DATETIME NULL,
  last_error TEXT NULL,
  details JSON NULL,
  PRIMARY KEY (scheduler_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
