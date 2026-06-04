CREATE TABLE IF NOT EXISTS item_stock_balances (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_id BIGINT UNSIGNED NULL,
    warehouse_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    quantity_on_hand DECIMAL(18,4) NOT NULL DEFAULT 0,
    quantity_allocated DECIMAL(18,4) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_item_stock_warehouse_item (warehouse_id, item_id),
    INDEX idx_item_stock_store_item (store_id, item_id),
    CONSTRAINT fk_item_stock_store
        FOREIGN KEY (store_id) REFERENCES stores(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_item_stock_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_item_stock_item
        FOREIGN KEY (item_id) REFERENCES items(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_item_stock_quantity_on_hand CHECK (quantity_on_hand >= 0),
    CONSTRAINT chk_item_stock_quantity_allocated CHECK (quantity_allocated >= 0)
);
