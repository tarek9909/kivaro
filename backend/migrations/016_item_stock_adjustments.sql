CREATE TABLE IF NOT EXISTS item_stock_adjustments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    quantity_change DECIMAL(18,4) NOT NULL,
    quantity_before DECIMAL(18,4) NOT NULL,
    quantity_after DECIMAL(18,4) NOT NULL,
    unit_cost DECIMAL(18,4) NULL,
    notes TEXT NULL,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_stock_adjustments_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_item_stock_adjustments_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_item_stock_adjustments_item
        FOREIGN KEY (item_id) REFERENCES items(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_item_stock_adjustments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_item_stock_adjustments_store_created (store_id, created_at),
    INDEX idx_item_stock_adjustments_warehouse (warehouse_id),
    INDEX idx_item_stock_adjustments_item (item_id)
);
