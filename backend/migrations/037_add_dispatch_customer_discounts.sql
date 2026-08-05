ALTER TABLE dispatch_customers
  ADD COLUMN discount_type ENUM('percent','fixed') NULL AFTER sublocation_id,
  ADD COLUMN discount_value DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER discount_type,
  ADD COLUMN discount_amount DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER discount_value;
