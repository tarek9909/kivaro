CREATE TABLE IF NOT EXISTS packaging_groups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(80) NOT NULL,
    charcoal_variant_id BIGINT UNSIGNED NULL,
    default_warehouse_id BIGINT UNSIGNED NULL,
    description TEXT NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_groups_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_groups_charcoal_variant
        FOREIGN KEY (charcoal_variant_id) REFERENCES item_variants(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_groups_default_warehouse
        FOREIGN KEY (default_warehouse_id) REFERENCES warehouses(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_groups_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY uq_packaging_groups_store_code (store_id, code),
    INDEX idx_packaging_groups_store_status (store_id, status),
    INDEX idx_packaging_groups_charcoal_variant (charcoal_variant_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS packaging_group_components (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    packaging_group_id BIGINT UNSIGNED NOT NULL,
    parent_component_id BIGINT UNSIGNED NULL,
    level_key ENUM('category','item','sub_item','sub_sub_item') NOT NULL,
    item_variant_id BIGINT UNSIGNED NOT NULL,
    unit_symbol ENUM('g','kg','ton','pc') NOT NULL DEFAULT 'pc',
    quantity_per_parent DECIMAL(18,4) NULL,
    capacity_kg DECIMAL(18,4) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_group_components_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_components_group
        FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_components_parent
        FOREIGN KEY (parent_component_id) REFERENCES packaging_group_components(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_group_components_variant
        FOREIGN KEY (item_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_packaging_group_components_qty CHECK (quantity_per_parent IS NULL OR quantity_per_parent > 0),
    CONSTRAINT chk_packaging_group_components_capacity CHECK (capacity_kg IS NULL OR capacity_kg >= 0),
    INDEX idx_packaging_group_components_group_level (packaging_group_id, level_key, sort_order),
    INDEX idx_packaging_group_components_parent (parent_component_id),
    INDEX idx_packaging_group_components_variant (item_variant_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS packaging_group_assignments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    packaging_group_id BIGINT UNSIGNED NOT NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    charcoal_variant_id BIGINT UNSIGNED NOT NULL,
    charcoal_quantity_kg DECIMAL(18,4) NOT NULL,
    primary_container_count INT NOT NULL DEFAULT 0,
    total_packaging_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
    cost_per_kg DECIMAL(18,4) NOT NULL DEFAULT 0,
    calculation_json JSON NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_packaging_assignments_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_assignments_group
        FOREIGN KEY (packaging_group_id) REFERENCES packaging_groups(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_assignments_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_assignments_charcoal_variant
        FOREIGN KEY (charcoal_variant_id) REFERENCES item_variants(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_packaging_assignments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_packaging_assignments_qty CHECK (charcoal_quantity_kg > 0),
    INDEX idx_packaging_assignments_store_created (store_id, created_at),
    INDEX idx_packaging_assignments_group (packaging_group_id),
    INDEX idx_packaging_assignments_warehouse (warehouse_id),
    INDEX idx_packaging_assignments_charcoal_variant (charcoal_variant_id)
) ENGINE=InnoDB;

INSERT IGNORE INTO store_modules (store_id, module_key, enabled)
SELECT id, 'inventory.packaging', 1
FROM stores;
