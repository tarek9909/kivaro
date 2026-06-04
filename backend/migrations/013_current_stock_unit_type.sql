CREATE OR REPLACE VIEW v_current_stock AS
SELECT
    sb.id AS stock_balance_id,
    sb.store_id,
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    i.id AS item_id,
    i.name AS item_name,
    i.item_type,
    u.unit_type,
    iv.id AS item_variant_id,
    iv.variant_name,
    iv.sku,
    CASE WHEN u.unit_type = 'weight' THEN 'kg' ELSE u.symbol END AS unit_symbol,
    sb.quantity_on_hand,
    sb.quantity_reserved,
    (sb.quantity_on_hand - sb.quantity_reserved) AS quantity_available,
    sb.average_cost,
    (sb.quantity_on_hand * sb.average_cost) AS stock_value
FROM stock_balances sb
JOIN warehouses w ON w.id = sb.warehouse_id
JOIN item_variants iv ON iv.id = sb.item_variant_id
JOIN items i ON i.id = iv.item_id
JOIN units u ON u.id = i.base_unit_id;
