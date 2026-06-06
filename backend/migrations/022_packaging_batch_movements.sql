CREATE TABLE IF NOT EXISTS packaging_batch_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    packaging_assignment_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    item_variant_id BIGINT UNSIGNED NULL,
    movement_type VARCHAR(100) NOT NULL DEFAULT 'batch_movement',
    quantity_change DECIMAL(18,4) NOT NULL,
    quantity_before DECIMAL(18,4) NOT NULL DEFAULT 0,
    quantity_after DECIMAL(18,4) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(18,4) NULL,
    reference_type VARCHAR(100) NULL,
    reference_id BIGINT UNSIGNED NULL,
    dispatch_item_id BIGINT UNSIGNED NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_movements_assignment (packaging_assignment_id),
    INDEX idx_batch_movements_store_created (store_id, created_at),
    INDEX idx_batch_movements_reference (reference_type, reference_id),
    INDEX idx_batch_movements_variant (item_variant_id),
    CONSTRAINT fk_batch_movements_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_batch_movements_assignment
        FOREIGN KEY (packaging_assignment_id) REFERENCES packaging_group_assignments(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_batch_movements_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_batch_movements_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_batch_movements_dispatch_item
        FOREIGN KEY (dispatch_item_id) REFERENCES dispatch_items(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_batch_movements_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
