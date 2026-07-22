const { query } = require('../../bootstrap/db');

function nullable(value) {
  return value === undefined || value === '' ? null : value;
}

async function connectionRows(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

async function connectionResult(connection, sql, params = []) {
  if (connection) {
    const [result] = await connection.execute(sql, params);
    return result;
  }
  return query(sql, params);
}

function buildWhere({ conditions = [], params = [], search, searchFields = [] }) {
  const finalConditions = [...conditions];
  const finalParams = [...params];

  if (search && searchFields.length) {
    const term = `%${search}%`;
    finalConditions.push(`(${searchFields.map((field) => `${field} LIKE ?`).join(' OR ')})`);
    finalParams.push(...searchFields.map(() => term));
  }

  return {
    whereClause: finalConditions.length ? `WHERE ${finalConditions.join(' AND ')}` : '',
    params: finalParams
  };
}

async function listWithCount(config) {
  const { whereClause, params } = buildWhere(config);
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM ${config.from}
     ${config.joins || ''}
     ${whereClause}`,
    params
  );
  const rows = await query(
    `${config.select}
     FROM ${config.from}
     ${config.joins || ''}
     ${whereClause}
     ${config.orderBy}
     LIMIT ? OFFSET ?`,
    [...params, config.pagination.limit, config.pagination.offset]
  );

  return { rows, total: Number(countRows[0]?.total || 0) };
}

function itemSelect(prefix = 'i') {
  return `${prefix}.id, ${prefix}.store_id, ${prefix}.category_id, ${prefix}.base_unit_id,
    ${prefix}.name, ${prefix}.code, ${prefix}.item_kind, ${prefix}.stock_mode,
    ${prefix}.kg_per_carton, ${prefix}.loose_units_per_carton, ${prefix}.max_content_weight_kg,
    CASE
      WHEN ${prefix}.stock_mode = 'carton_weight' AND ${prefix}.loose_units_per_carton > 0
      THEN ${prefix}.kg_per_carton / ${prefix}.loose_units_per_carton
      ELSE NULL
    END AS loose_unit_weight_kg,
    ${prefix}.description, ${prefix}.default_cost, ${prefix}.default_selling_price,
    ${prefix}.carton_selling_price, ${prefix}.loose_unit_selling_price,
    ${prefix}.reorder_level, ${prefix}.status, ${prefix}.created_by,
    ${prefix}.created_at, ${prefix}.updated_at`;
}

async function listCategories({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.status) {
    conditions.push('c.status = ?');
    params.push(filters.status);
  }
  if (filters.parent_id) {
    conditions.push('c.parent_id = ?');
    params.push(filters.parent_id);
  }
  if (filters.store_id) {
    conditions.push('c.store_id = ?');
    params.push(filters.store_id);
  }

  return listWithCount({
    select: `SELECT c.id, c.store_id, c.parent_id, p.name AS parent_name, c.name, c.code,
      c.description, c.status, c.created_at, c.updated_at`,
    from: 'item_categories c',
    joins: 'LEFT JOIN item_categories p ON p.id = c.parent_id',
    conditions,
    params,
    search: filters.search,
    searchFields: ['c.name', 'c.code'],
    orderBy: 'ORDER BY c.name ASC',
    pagination
  });
}

async function findCategoryById(id) {
  const rows = await query(
    `SELECT id, store_id, parent_id, name, code, description, status, created_at, updated_at
     FROM item_categories WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createCategory(data) {
  const result = await query(
    `INSERT INTO item_categories (store_id, parent_id, name, code, description, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.store_id, nullable(data.parent_id), data.name, nullable(data.code), nullable(data.description), data.status || 'active']
  );
  return findCategoryById(result.insertId);
}

async function deactivateCategory(id) {
  const result = await query(`UPDATE item_categories SET status = 'inactive' WHERE id = ?`, [id]);
  return result.affectedRows;
}

async function hardDeleteCategory(id) {
  const result = await query('DELETE FROM item_categories WHERE id = ?', [id]);
  return result.affectedRows;
}

async function listUnits({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.store_id) {
    conditions.push('u.store_id = ?');
    params.push(filters.store_id);
  }
  return listWithCount({
    select: `SELECT u.id, u.store_id, u.name, u.symbol, u.unit_type, u.base_unit_id,
      b.symbol AS base_unit_symbol, u.conversion_to_base, u.created_at`,
    from: 'units u',
    joins: 'LEFT JOIN units b ON b.id = u.base_unit_id',
    conditions,
    params,
    search: filters.search,
    searchFields: ['u.name', 'u.symbol'],
    orderBy: 'ORDER BY u.unit_type ASC, u.name ASC',
    pagination
  });
}

async function findUnitById(id) {
  const rows = await query(
    `SELECT id, store_id, name, symbol, unit_type, base_unit_id, conversion_to_base, created_at
     FROM units WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createUnit(data) {
  const result = await query(
    `INSERT INTO units (store_id, name, symbol, unit_type, base_unit_id, conversion_to_base)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.store_id, data.name, data.symbol, data.unit_type || 'quantity', nullable(data.base_unit_id), data.conversion_to_base || 1]
  );
  return findUnitById(result.insertId);
}

async function deleteUnit(id) {
  const result = await query('DELETE FROM units WHERE id = ?', [id]);
  return result.affectedRows;
}

async function listItems({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.status) {
    conditions.push('i.status = ?');
    params.push(filters.status);
  }
  if (filters.item_kind) {
    conditions.push('i.item_kind = ?');
    params.push(filters.item_kind);
  }
  if (filters.stock_mode) {
    conditions.push('i.stock_mode = ?');
    params.push(filters.stock_mode);
  }
  if (filters.category_id) {
    conditions.push('i.category_id = ?');
    params.push(filters.category_id);
  }
  if (filters.store_id) {
    conditions.push('i.store_id = ?');
    params.push(filters.store_id);
  }
  if (filters.low_stock) {
    conditions.push(`i.reorder_level > 0
      AND COALESCE(item_stock.quantity_on_hand - item_stock.quantity_reserved, 0) <= i.reorder_level`);
  }

  return listWithCount({
    select: `SELECT ${itemSelect('i')}, c.name AS category_name,
      u.symbol AS base_unit_symbol, u.unit_type AS base_unit_type,
      u.conversion_to_base AS base_unit_conversion_to_base,
      COALESCE(item_stock.quantity_on_hand, 0) AS quantity_on_hand,
      COALESCE(item_stock.quantity_reserved, 0) AS quantity_reserved,
      COALESCE(item_stock.quantity_on_hand - item_stock.quantity_reserved, 0) AS quantity_available,
      COALESCE(item_stock.average_cost, 0) AS average_cost,
      COALESCE(item_stock.quantity_on_hand * item_stock.average_cost, 0) AS stock_value,
      CASE
        WHEN i.reorder_level > 0
          AND COALESCE(item_stock.quantity_on_hand - item_stock.quantity_reserved, 0) <= i.reorder_level
        THEN 'low'
        ELSE 'healthy'
      END AS stock_health`,
    from: 'items i',
    joins: `JOIN item_categories c ON c.id = i.category_id
      JOIN units u ON u.id = i.base_unit_id
      LEFT JOIN (
        SELECT item_id,
          SUM(quantity_on_hand) AS quantity_on_hand,
          SUM(quantity_reserved) AS quantity_reserved,
          CASE WHEN SUM(quantity_on_hand) > 0
            THEN SUM(quantity_on_hand * average_cost) / SUM(quantity_on_hand)
            ELSE 0
          END AS average_cost
        FROM item_stock_balances
        GROUP BY item_id
      ) item_stock ON item_stock.item_id = i.id`,
    conditions,
    params,
    search: filters.search,
    searchFields: ['i.name', 'i.code'],
    orderBy: 'ORDER BY i.name ASC',
    pagination
  });
}

async function findItemById(id, connection = null) {
  const sql = `SELECT ${itemSelect('i')}, u.symbol AS base_unit_symbol,
      u.unit_type AS base_unit_type, u.conversion_to_base AS base_unit_conversion_to_base,
      c.name AS category_name
    FROM items i
    JOIN units u ON u.id = i.base_unit_id
    JOIN item_categories c ON c.id = i.category_id
    WHERE i.id = ?
    LIMIT 1`;
  const rows = await connectionRows(connection, sql, [id]);
  return rows[0] || null;
}

async function createItem(data, connection = null) {
  const result = await connectionResult(
    connection,
    `INSERT INTO items (
      store_id, category_id, base_unit_id, name, code, item_kind, stock_mode,
      kg_per_carton, loose_units_per_carton, max_content_weight_kg, description,
      default_cost, default_selling_price, carton_selling_price, loose_unit_selling_price,
      reorder_level, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.category_id,
      data.base_unit_id,
      data.name,
      data.code,
      data.item_kind,
      data.stock_mode,
      nullable(data.kg_per_carton),
      nullable(data.loose_units_per_carton),
      nullable(data.max_content_weight_kg),
      nullable(data.description),
      data.default_cost || 0,
      nullable(data.default_selling_price),
      nullable(data.carton_selling_price),
      nullable(data.loose_unit_selling_price),
      data.reorder_level || 0,
      data.status || 'active',
      nullable(data.created_by)
    ]
  );
  return findItemById(result.insertId, connection);
}

async function countItemMovements(itemId) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM item_stock_movements WHERE item_id = ?',
    [itemId]
  );
  return Number(rows[0]?.total || 0);
}

async function hasItemStock(itemId) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM item_stock_balances
     WHERE item_id = ? AND (quantity_on_hand <> 0 OR quantity_reserved <> 0)`,
    [itemId]
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function deactivateItem(id) {
  const result = await query(`UPDATE items SET status = 'inactive' WHERE id = ?`, [id]);
  return result.affectedRows;
}

async function hardDeleteItemCascade(id, connection = null) {
  await connectionResult(connection, 'DELETE FROM open_carton_shelves WHERE item_id = ?', [id]);
  await connectionResult(connection, 'DELETE FROM carton_stock_lots WHERE item_id = ?', [id]);
  await connectionResult(connection, 'DELETE FROM item_stock_balances WHERE item_id = ?', [id]);
  const result = await connectionResult(connection, 'DELETE FROM items WHERE id = ?', [id]);
  return { itemDeleted: result.affectedRows || 0 };
}

async function listWarehouses({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.status) {
    conditions.push('w.status = ?');
    params.push(filters.status);
  }
  if (filters.location_id) {
    conditions.push('w.location_id = ?');
    params.push(filters.location_id);
  }
  if (filters.store_id) {
    conditions.push('w.store_id = ?');
    params.push(filters.store_id);
  }
  return listWithCount({
    select: `SELECT w.id, w.store_id, w.location_id, l.name AS location_name,
      w.name, w.code, w.address, w.status, w.created_at, w.updated_at`,
    from: 'warehouses w',
    joins: 'LEFT JOIN locations l ON l.id = w.location_id',
    conditions,
    params,
    search: filters.search,
    searchFields: ['w.name', 'w.code', 'w.address'],
    orderBy: 'ORDER BY w.name ASC',
    pagination
  });
}

async function findWarehouseById(id) {
  const rows = await query(
    `SELECT id, store_id, location_id, name, code, address, status, created_at, updated_at
     FROM warehouses WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createWarehouse(data) {
  const result = await query(
    `INSERT INTO warehouses (store_id, location_id, name, code, address, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.store_id, nullable(data.location_id), data.name, data.code, nullable(data.address), data.status || 'active']
  );
  return findWarehouseById(result.insertId);
}

async function deactivateWarehouse(id) {
  const result = await query(`UPDATE warehouses SET status = 'inactive' WHERE id = ?`, [id]);
  return result.affectedRows;
}

async function listStockBalances({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.warehouse_id) {
    conditions.push('b.warehouse_id = ?');
    params.push(filters.warehouse_id);
  }
  if (filters.item_id) {
    conditions.push('b.item_id = ?');
    params.push(filters.item_id);
  }
  if (filters.item_kind) {
    conditions.push('i.item_kind = ?');
    params.push(filters.item_kind);
  }
  if (filters.stock_mode) {
    conditions.push('i.stock_mode = ?');
    params.push(filters.stock_mode);
  }
  if (filters.store_id) {
    conditions.push('b.store_id = ?');
    params.push(filters.store_id);
  }
  if (filters.low_stock) {
    conditions.push(`i.reorder_level > 0
      AND (b.quantity_on_hand - b.quantity_reserved) <= i.reorder_level`);
  }

  return listWithCount({
    select: `SELECT b.id AS stock_balance_id, b.store_id, b.warehouse_id, w.name AS warehouse_name,
      b.item_id, i.name AS item_name, i.code AS item_code, i.item_kind, i.stock_mode,
      i.kg_per_carton, i.loose_units_per_carton, i.max_content_weight_kg,
      CASE WHEN i.stock_mode = 'carton_weight' AND i.loose_units_per_carton > 0
        THEN i.kg_per_carton / i.loose_units_per_carton ELSE NULL END AS loose_unit_weight_kg,
      u.symbol AS base_unit_symbol, u.unit_type AS base_unit_type,
      b.quantity_on_hand, b.quantity_reserved,
      (b.quantity_on_hand - b.quantity_reserved) AS quantity_available,
      b.average_cost, (b.quantity_on_hand * b.average_cost) AS stock_value,
      COALESCE(lots.sealed_cartons, 0) AS sealed_cartons,
      COALESCE(shelves.open_loose_units, 0) AS open_loose_units,
      CASE WHEN i.reorder_level > 0 AND (b.quantity_on_hand - b.quantity_reserved) <= i.reorder_level
        THEN 'low' ELSE 'healthy' END AS stock_health,
      b.updated_at`,
    from: 'item_stock_balances b',
    joins: `JOIN warehouses w ON w.id = b.warehouse_id
      JOIN items i ON i.id = b.item_id
      JOIN units u ON u.id = i.base_unit_id
      LEFT JOIN (
        SELECT warehouse_id, item_id, SUM(remaining_cartons) AS sealed_cartons
        FROM carton_stock_lots
        GROUP BY warehouse_id, item_id
      ) lots ON lots.warehouse_id = b.warehouse_id AND lots.item_id = b.item_id
      LEFT JOIN (
        SELECT warehouse_id, item_id, SUM(remaining_loose_units) AS open_loose_units
        FROM open_carton_shelves
        WHERE status = 'open'
        GROUP BY warehouse_id, item_id
      ) shelves ON shelves.warehouse_id = b.warehouse_id AND shelves.item_id = b.item_id`,
    conditions,
    params,
    search: filters.search,
    searchFields: ['i.name', 'i.code', 'w.name'],
    orderBy: 'ORDER BY w.name ASC, i.name ASC',
    pagination
  });
}

async function listStockMovements({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.warehouse_id) {
    conditions.push('sm.warehouse_id = ?');
    params.push(filters.warehouse_id);
  }
  if (filters.item_id) {
    conditions.push('sm.item_id = ?');
    params.push(filters.item_id);
  }
  if (filters.item_kind) {
    conditions.push('i.item_kind = ?');
    params.push(filters.item_kind);
  }
  if (filters.movement_type) {
    conditions.push('sm.movement_type = ?');
    params.push(filters.movement_type);
  }
  if (filters.reference_type) {
    conditions.push('sm.reference_type = ?');
    params.push(filters.reference_type);
  }
  if (filters.store_id) {
    conditions.push('sm.store_id = ?');
    params.push(filters.store_id);
  }
  if (filters.date_from) {
    conditions.push('DATE(sm.created_at) >= ?');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push('DATE(sm.created_at) <= ?');
    params.push(filters.date_to);
  }

  return listWithCount({
    select: `SELECT sm.id AS movement_id, sm.store_id, sm.warehouse_id, w.name AS warehouse_name,
      sm.item_id, i.name AS item_name, i.code AS item_code, i.item_kind, i.stock_mode,
      sm.movement_type, sm.quantity_change, sm.quantity_before, sm.quantity_after,
      sm.reserved_quantity_change, sm.reserved_quantity_before, sm.reserved_quantity_after,
      sm.unit_cost, sm.total_cost, sm.carton_stock_lot_id, sm.open_carton_shelf_id,
      sm.reference_type, sm.reference_id, sm.notes,
      CASE WHEN i.stock_mode IN ('weight', 'carton_weight') THEN 'kg' ELSE u.symbol END AS stock_unit_symbol,
      sm.created_by, sm.created_at`,
    from: 'item_stock_movements sm',
    joins: `JOIN warehouses w ON w.id = sm.warehouse_id
      JOIN items i ON i.id = sm.item_id
      JOIN units u ON u.id = i.base_unit_id`,
    conditions,
    params,
    search: filters.search,
    searchFields: ['i.name', 'i.code', 'w.name', 'sm.reference_type', 'sm.notes'],
    orderBy: 'ORDER BY sm.created_at DESC, sm.id DESC',
    pagination
  });
}

async function listStockAdjustments({ filters, pagination }) {
  return listStockMovements({
    filters: { ...filters, movement_type: 'stock_adjustment' },
    pagination
  });
}

async function listCartonLots({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.warehouse_id) {
    conditions.push('l.warehouse_id = ?');
    params.push(filters.warehouse_id);
  }
  if (filters.item_id) {
    conditions.push('l.item_id = ?');
    params.push(filters.item_id);
  }
  if (filters.source_type) {
    conditions.push('l.source_type = ?');
    params.push(filters.source_type);
  }
  if (filters.store_id) {
    conditions.push('l.store_id = ?');
    params.push(filters.store_id);
  }
  return listWithCount({
    select: `SELECT l.id AS carton_lot_id, l.store_id, l.warehouse_id, w.name AS warehouse_name,
      l.item_id, i.name AS item_name, i.code AS item_code, l.received_cartons,
      l.remaining_cartons, l.kg_per_carton, l.loose_units_per_carton, l.unit_cost_per_kg,
      l.source_type, l.source_id, l.received_at, l.created_by, l.created_at, l.updated_at`,
    from: 'carton_stock_lots l',
    joins: 'JOIN warehouses w ON w.id = l.warehouse_id JOIN items i ON i.id = l.item_id',
    conditions,
    params,
    search: filters.search,
    searchFields: ['i.name', 'i.code', 'w.name', 'l.source_type'],
    orderBy: 'ORDER BY l.received_at ASC, l.id ASC',
    pagination
  });
}

async function listOpenCartonShelves({ filters, pagination }) {
  const conditions = [];
  const params = [];
  if (filters.warehouse_id) {
    conditions.push('s.warehouse_id = ?');
    params.push(filters.warehouse_id);
  }
  if (filters.item_id) {
    conditions.push('s.item_id = ?');
    params.push(filters.item_id);
  }
  if (filters.status) {
    conditions.push('s.status = ?');
    params.push(filters.status);
  }
  if (filters.store_id) {
    conditions.push('s.store_id = ?');
    params.push(filters.store_id);
  }
  return listWithCount({
    select: `SELECT s.id AS open_carton_shelf_id, s.store_id, s.warehouse_id, w.name AS warehouse_name,
      s.item_id, i.name AS item_name, i.code AS item_code, s.carton_lot_id,
      s.initial_loose_units, s.remaining_loose_units, s.loose_unit_weight_kg,
      s.status, s.opened_at, s.opened_by, s.closed_at, s.created_at, s.updated_at`,
    from: 'open_carton_shelves s',
    joins: 'JOIN warehouses w ON w.id = s.warehouse_id JOIN items i ON i.id = s.item_id',
    conditions,
    params,
    search: filters.search,
    searchFields: ['i.name', 'i.code', 'w.name'],
    orderBy: `ORDER BY CASE WHEN s.status = 'open' THEN 0 ELSE 1 END, s.opened_at ASC, s.id ASC`,
    pagination
  });
}

async function getItemStockBalanceForUpdate(connection, warehouseId, itemId) {
  const [rows] = await connection.execute(
    `SELECT id, store_id, warehouse_id, item_id, quantity_on_hand, quantity_reserved, average_cost
     FROM item_stock_balances
     WHERE warehouse_id = ? AND item_id = ?
     LIMIT 1
     FOR UPDATE`,
    [warehouseId, itemId]
  );
  return rows[0] || null;
}

async function createItemStockBalance(connection, data) {
  await connection.execute(
    `INSERT INTO item_stock_balances (
      store_id, warehouse_id, item_id, quantity_on_hand, quantity_reserved, average_cost
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [
      nullable(data.store_id), data.warehouse_id, data.item_id,
      data.quantity_on_hand || 0, data.quantity_reserved || 0, data.average_cost || 0
    ]
  );
  return getItemStockBalanceForUpdate(connection, data.warehouse_id, data.item_id);
}

async function getOrCreateItemStockBalanceForUpdate(connection, data) {
  const existing = await getItemStockBalanceForUpdate(connection, data.warehouse_id, data.item_id);
  if (existing) return existing;
  await createItemStockBalance(connection, {
    store_id: data.store_id,
    warehouse_id: data.warehouse_id,
    item_id: data.item_id,
    quantity_on_hand: 0,
    quantity_reserved: 0,
    average_cost: 0
  });
  return getItemStockBalanceForUpdate(connection, data.warehouse_id, data.item_id);
}

async function updateItemStockBalance(connection, id, data) {
  const fields = [];
  const params = [];
  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (!fields.length) return;
  await connection.execute(
    `UPDATE item_stock_balances SET ${fields.join(', ')} WHERE id = ?`,
    [...params, id]
  );
}

async function createItemStockMovement(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO item_stock_movements (
      store_id, warehouse_id, item_id, movement_type, quantity_change, quantity_before,
      quantity_after, reserved_quantity_change, reserved_quantity_before, reserved_quantity_after,
      unit_cost, total_cost, carton_stock_lot_id, open_carton_shelf_id,
      reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id), data.warehouse_id, data.item_id, data.movement_type,
      data.quantity_change, data.quantity_before, data.quantity_after,
      data.reserved_quantity_change || 0, data.reserved_quantity_before || 0,
      data.reserved_quantity_after || 0, nullable(data.unit_cost), nullable(data.total_cost),
      nullable(data.carton_stock_lot_id), nullable(data.open_carton_shelf_id),
      nullable(data.reference_type), nullable(data.reference_id), nullable(data.notes),
      nullable(data.created_by)
    ]
  );
  return result.insertId;
}

async function createCartonStockLot(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO carton_stock_lots (
      store_id, warehouse_id, item_id, received_cartons, remaining_cartons,
      kg_per_carton, loose_units_per_carton, unit_cost_per_kg,
      source_type, source_id, received_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)`,
    [
      nullable(data.store_id), data.warehouse_id, data.item_id,
      data.received_cartons, data.remaining_cartons, data.kg_per_carton,
      data.loose_units_per_carton, data.unit_cost_per_kg,
      nullable(data.source_type), nullable(data.source_id), nullable(data.received_at),
      nullable(data.created_by)
    ]
  );
  return result.insertId;
}

async function getCartonLotForUpdate(connection, lotId) {
  const [rows] = await connection.execute(
    `SELECT id, store_id, warehouse_id, item_id, received_cartons, remaining_cartons,
      kg_per_carton, loose_units_per_carton, unit_cost_per_kg, source_type, source_id,
      received_at, created_by, created_at, updated_at,
      COALESCE((
        SELECT SUM(dla.inventory_quantity) / carton_stock_lots.kg_per_carton
        FROM dispatch_line_allocations dla
        WHERE dla.carton_stock_lot_id = carton_stock_lots.id
          AND dla.allocation_type = 'carton_lot'
          AND dla.status = 'reserved'
      ), 0) AS reserved_cartons
     FROM carton_stock_lots WHERE id = ? LIMIT 1 FOR UPDATE`,
    [lotId]
  );
  return rows[0] || null;
}

async function getAvailableCartonLotsForUpdate(connection, warehouseId, itemId) {
  const [rows] = await connection.execute(
    `SELECT l.id, l.store_id, l.warehouse_id, l.item_id, l.received_cartons, l.remaining_cartons,
      l.kg_per_carton, l.loose_units_per_carton, l.unit_cost_per_kg, l.source_type, l.source_id,
      l.received_at, l.created_by, l.created_at, l.updated_at,
      COALESCE(reserved.reserved_inventory_quantity, 0) / l.kg_per_carton AS reserved_cartons,
      GREATEST(
        FLOOR(l.remaining_cartons - COALESCE(reserved.reserved_inventory_quantity, 0) / l.kg_per_carton),
        0
      ) AS available_cartons
     FROM carton_stock_lots l
     LEFT JOIN (
       SELECT carton_stock_lot_id, SUM(inventory_quantity) AS reserved_inventory_quantity
       FROM dispatch_line_allocations
       WHERE allocation_type = 'carton_lot' AND status = 'reserved'
       GROUP BY carton_stock_lot_id
     ) reserved ON reserved.carton_stock_lot_id = l.id
     WHERE l.warehouse_id = ? AND l.item_id = ?
       AND FLOOR(l.remaining_cartons - COALESCE(reserved.reserved_inventory_quantity, 0) / l.kg_per_carton) > 0
     ORDER BY l.received_at ASC, l.id ASC
     FOR UPDATE`,
    [warehouseId, itemId]
  );
  return rows;
}

async function updateCartonStockLot(connection, id, data) {
  const fields = [];
  const params = [];
  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (!fields.length) return;
  await connection.execute(
    `UPDATE carton_stock_lots SET ${fields.join(', ')} WHERE id = ?`,
    [...params, id]
  );
}

async function getActiveOpenCartonShelfForUpdate(connection, warehouseId, itemId) {
  const [rows] = await connection.execute(
    `SELECT s.id, s.store_id, s.warehouse_id, s.item_id, s.carton_lot_id, s.initial_loose_units,
      s.remaining_loose_units, s.loose_unit_weight_kg, s.status, s.opened_at, s.opened_by,
      s.closed_at, s.created_at, s.updated_at,
      COALESCE(reserved.reserved_inventory_quantity, 0) AS reserved_inventory_quantity,
      GREATEST(
        s.remaining_loose_units - COALESCE(reserved.reserved_inventory_quantity, 0) / s.loose_unit_weight_kg,
        0
      ) AS available_loose_units
     FROM open_carton_shelves s
     LEFT JOIN (
       SELECT open_carton_shelf_id, SUM(inventory_quantity) AS reserved_inventory_quantity
       FROM dispatch_line_allocations
       WHERE allocation_type = 'open_carton_shelf' AND status = 'reserved'
       GROUP BY open_carton_shelf_id
     ) reserved ON reserved.open_carton_shelf_id = s.id
     WHERE s.warehouse_id = ? AND s.item_id = ? AND s.status = 'open'
     ORDER BY s.opened_at ASC, s.id ASC
     LIMIT 1
     FOR UPDATE`,
    [warehouseId, itemId]
  );
  return rows[0] || null;
}

async function getOpenCartonShelfForUpdate(connection, shelfId) {
  const [rows] = await connection.execute(
    `SELECT s.id, s.store_id, s.warehouse_id, s.item_id, s.carton_lot_id, s.initial_loose_units,
      s.remaining_loose_units, s.loose_unit_weight_kg, s.status, s.opened_at, s.opened_by,
      s.closed_at, s.created_at, s.updated_at,
      COALESCE(reserved.reserved_inventory_quantity, 0) AS reserved_inventory_quantity,
      GREATEST(
        s.remaining_loose_units - COALESCE(reserved.reserved_inventory_quantity, 0) / s.loose_unit_weight_kg,
        0
      ) AS available_loose_units
     FROM open_carton_shelves s
     LEFT JOIN (
       SELECT open_carton_shelf_id, SUM(inventory_quantity) AS reserved_inventory_quantity
       FROM dispatch_line_allocations
       WHERE allocation_type = 'open_carton_shelf' AND status = 'reserved'
       GROUP BY open_carton_shelf_id
     ) reserved ON reserved.open_carton_shelf_id = s.id
     WHERE s.id = ?
     LIMIT 1
     FOR UPDATE`,
    [shelfId]
  );
  return rows[0] || null;
}

async function createOpenCartonShelf(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO open_carton_shelves (
      store_id, warehouse_id, item_id, carton_lot_id, initial_loose_units,
      remaining_loose_units, loose_unit_weight_kg, status, opened_at, opened_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', COALESCE(?, CURRENT_TIMESTAMP), ?)`,
    [
      nullable(data.store_id), data.warehouse_id, data.item_id, data.carton_lot_id,
      data.initial_loose_units, data.remaining_loose_units, data.loose_unit_weight_kg,
      nullable(data.opened_at), nullable(data.opened_by)
    ]
  );
  return result.insertId;
}

async function updateOpenCartonShelf(connection, id, data) {
  const fields = [];
  const params = [];
  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined && column !== 'closed_at') {
      fields.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (data.closed_at !== undefined) {
    if (data.closed_at === 'CURRENT_TIMESTAMP') {
      fields.push('closed_at = CURRENT_TIMESTAMP');
    } else {
      fields.push('closed_at = ?');
      params.push(data.closed_at);
    }
  }
  if (!fields.length) return;
  await connection.execute(
    `UPDATE open_carton_shelves SET ${fields.join(', ')} WHERE id = ?`,
    [...params, id]
  );
}

async function updateById(tableName, id, data, findById) {
  const fields = [];
  const params = [];
  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(nullable(value));
    }
  }
  if (fields.length) {
    await query(`UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findById(id);
}

async function updateCategory(id, data) {
  return updateById('item_categories', id, data, findCategoryById);
}

async function updateUnit(id, data) {
  return updateById('units', id, data, findUnitById);
}

async function updateItem(id, data) {
  return updateById('items', id, data, findItemById);
}

async function updateWarehouse(id, data) {
  return updateById('warehouses', id, data, findWarehouseById);
}

module.exports = {
  countItemMovements,
  createCartonStockLot,
  createCategory,
  createItem,
  createItemStockBalance,
  createItemStockMovement,
  createOpenCartonShelf,
  createUnit,
  createWarehouse,
  deactivateCategory,
  deactivateItem,
  deactivateWarehouse,
  deleteUnit,
  findCategoryById,
  findItemById,
  findUnitById,
  findWarehouseById,
  getActiveOpenCartonShelfForUpdate,
  getOpenCartonShelfForUpdate,
  getAvailableCartonLotsForUpdate,
  getCartonLotForUpdate,
  getItemStockBalanceForUpdate,
  getOrCreateItemStockBalanceForUpdate,
  hardDeleteCategory,
  hardDeleteItemCascade,
  hasItemStock,
  listCartonLots,
  listCategories,
  listItems,
  listOpenCartonShelves,
  listStockAdjustments,
  listStockBalances,
  listStockMovements,
  listUnits,
  listWarehouses,
  updateCartonStockLot,
  updateCategory,
  updateItem,
  updateItemStockBalance,
  updateOpenCartonShelf,
  updateUnit,
  updateWarehouse
};
