ALTER TABLE purchase_order_items
  ADD COLUMN item_id BIGINT UNSIGNED NULL AFTER purchase_order_id,
  MODIFY COLUMN item_variant_id BIGINT UNSIGNED NULL,
  ADD INDEX idx_purchase_order_items_item (item_id),
  ADD CONSTRAINT fk_purchase_order_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE purchase_order_items poi
JOIN item_variants iv ON iv.id = poi.item_variant_id
SET poi.item_id = iv.item_id
WHERE poi.item_id IS NULL
  AND poi.item_variant_id IS NOT NULL;

ALTER TABLE purchase_order_items
  MODIFY COLUMN item_id BIGINT UNSIGNED NOT NULL;

ALTER TABLE purchase_receipt_items
  ADD COLUMN item_id BIGINT UNSIGNED NULL AFTER purchase_order_item_id,
  MODIFY COLUMN item_variant_id BIGINT UNSIGNED NULL,
  ADD INDEX idx_purchase_receipt_items_item (item_id),
  ADD CONSTRAINT fk_purchase_receipt_items_item
    FOREIGN KEY (item_id) REFERENCES items(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE purchase_receipt_items pri
JOIN purchase_order_items poi ON poi.id = pri.purchase_order_item_id
SET pri.item_id = poi.item_id
WHERE pri.item_id IS NULL;

ALTER TABLE purchase_receipt_items
  MODIFY COLUMN item_id BIGINT UNSIGNED NOT NULL;
