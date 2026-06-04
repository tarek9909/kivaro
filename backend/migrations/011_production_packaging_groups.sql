ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS packaging_group_id BIGINT UNSIGNED NULL AFTER packaging_configuration_id;

ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS charcoal_variant_id BIGINT UNSIGNED NULL AFTER warehouse_id;

ALTER TABLE production_batches
  MODIFY packaging_configuration_id BIGINT UNSIGNED NULL;

ALTER TABLE production_batches
  ADD CONSTRAINT fk_production_batches_packaging_group
    FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE production_batches
  ADD CONSTRAINT fk_production_batches_charcoal_variant
    FOREIGN KEY (charcoal_variant_id) REFERENCES item_variants(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE production_batches
  ADD INDEX idx_production_batches_packaging_group (packaging_group_id);
