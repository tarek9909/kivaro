ALTER TABLE packaging_group_assignments
  ADD COLUMN status ENUM('calculated','consumed','cancelled') NOT NULL DEFAULT 'calculated' AFTER cost_per_kg,
  ADD COLUMN production_batch_id BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN consumed_at DATETIME NULL AFTER calculation_json,
  ADD COLUMN consumed_by BIGINT UNSIGNED NULL AFTER consumed_at,
  ADD COLUMN consumed_movements_json JSON NULL AFTER consumed_by,
  ADD CONSTRAINT fk_packaging_assignments_production_batch
      FOREIGN KEY (production_batch_id) REFERENCES production_batches(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_packaging_assignments_consumed_by
      FOREIGN KEY (consumed_by) REFERENCES users(id)
      ON DELETE SET NULL ON UPDATE CASCADE,
  ADD INDEX idx_packaging_assignments_status (store_id, status),
  ADD INDEX idx_packaging_assignments_production_batch (production_batch_id);

INSERT IGNORE INTO store_modules (store_id, module_key, enabled)
SELECT id, 'reports.packaging-assignments', 1
FROM stores;

INSERT IGNORE INTO store_modules (store_id, module_key, enabled)
SELECT id, 'reports.packaging-shortages', 1
FROM stores;
