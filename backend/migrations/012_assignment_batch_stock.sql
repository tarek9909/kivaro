ALTER TABLE packaging_group_assignments
  ADD COLUMN output_item_variant_id BIGINT UNSIGNED NULL AFTER charcoal_variant_id,
  ADD COLUMN produced_quantity DECIMAL(18,4) NOT NULL DEFAULT 0 AFTER primary_container_count,
  ADD CONSTRAINT fk_packaging_group_assignments_output_variant
    FOREIGN KEY (output_item_variant_id) REFERENCES item_variants(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD INDEX idx_packaging_group_assignments_output_variant (output_item_variant_id);

ALTER TABLE dispatch_items
  ADD COLUMN packaging_assignment_id BIGINT UNSIGNED NULL AFTER item_variant_id,
  ADD CONSTRAINT fk_dispatch_items_packaging_assignment
    FOREIGN KEY (packaging_assignment_id) REFERENCES packaging_group_assignments(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD INDEX idx_dispatch_items_packaging_assignment (packaging_assignment_id);
