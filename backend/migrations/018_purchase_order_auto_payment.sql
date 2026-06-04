ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS cash_account_id BIGINT UNSIGNED NULL AFTER warehouse_id;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS payment_method ENUM('cash','bank_transfer','cheque','other') NOT NULL DEFAULT 'cash' AFTER cash_account_id;

ALTER TABLE purchase_orders
  ADD INDEX idx_purchase_orders_cash_account (cash_account_id);
