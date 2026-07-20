INSERT IGNORE INTO units (store_id, name, symbol, unit_type, base_unit_id, conversion_to_base)
SELECT id, 'Kilogram', 'kg', 'weight', NULL, 1
FROM stores;

INSERT IGNORE INTO units (store_id, name, symbol, unit_type, base_unit_id, conversion_to_base)
SELECT id, 'Piece', 'pc', 'quantity', NULL, 1
FROM stores;

INSERT IGNORE INTO units (store_id, name, symbol, unit_type, base_unit_id, conversion_to_base)
SELECT s.id, 'Gram', 'g', 'weight', kg.id, 0.001
FROM stores s
JOIN units kg ON kg.store_id = s.id AND kg.symbol = 'kg';

INSERT IGNORE INTO units (store_id, name, symbol, unit_type, base_unit_id, conversion_to_base)
SELECT s.id, 'Ton', 'ton', 'weight', kg.id, 1000
FROM stores s
JOIN units kg ON kg.store_id = s.id AND kg.symbol = 'kg';
