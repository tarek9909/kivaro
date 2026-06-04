const { query } = require('../../bootstrap/db');

function buildWhere({ conditions = [], params = [], search, searchFields = [] }) {
  const finalConditions = [...conditions];
  const finalParams = [...params];

  if (search && searchFields.length > 0) {
    const term = `%${search}%`;
    finalConditions.push(
      `(${searchFields.map((field) => `${field} LIKE ?`).join(' OR ')})`
    );
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

  return {
    rows,
    total: Number(countRows[0].total)
  };
}

function nullable(value) {
  return value === undefined || value === '' ? null : value;
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
    select: `SELECT c.id, c.store_id, c.parent_id, p.name AS parent_name, c.name, c.code, c.description, c.status, c.created_at, c.updated_at`,
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
     FROM item_categories
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createCategory(data) {
  const result = await query(
    `INSERT INTO item_categories (store_id, parent_id, name, code, description, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      nullable(data.parent_id),
      data.name,
      nullable(data.code),
      nullable(data.description),
      data.status || 'active'
    ]
  );

  return findCategoryById(result.insertId);
}

async function updateCategory(id, data) {
  return updateById('item_categories', id, data, findCategoryById);
}

async function deactivateCategory(id) {
  const result = await query(
    `UPDATE item_categories
     SET status = 'inactive'
     WHERE id = ?`,
    [id]
  );

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
    select: `SELECT u.id, u.store_id, u.name, u.symbol, u.unit_type, u.base_unit_id, b.symbol AS base_unit_symbol, u.conversion_to_base, u.created_at`,
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
     FROM units
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createUnit(data) {
  const result = await query(
    `INSERT INTO units (store_id, name, symbol, unit_type, base_unit_id, conversion_to_base)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.name,
      data.symbol,
      data.unit_type || 'quantity',
      nullable(data.base_unit_id),
      data.conversion_to_base || 1
    ]
  );

  return findUnitById(result.insertId);
}

async function updateUnit(id, data) {
  return updateById('units', id, data, findUnitById);
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

  if (filters.item_type) {
    conditions.push('i.item_type = ?');
    params.push(filters.item_type);
  }

  if (filters.exclude_item_type) {
    conditions.push('i.item_type <> ?');
    params.push(filters.exclude_item_type);
  }

  if (filters.category_id) {
    conditions.push('i.category_id = ?');
    params.push(filters.category_id);
  }
  if (filters.store_id) {
    conditions.push('i.store_id = ?');
    params.push(filters.store_id);
  }

  return listWithCount({
    select: `SELECT
      i.id, i.store_id, i.category_id, c.name AS category_name, i.base_unit_id, u.symbol AS base_unit_symbol,
      i.name, i.code, i.item_type, i.tracking_type, i.description, i.default_cost,
      i.default_selling_price, i.reorder_level, i.status, i.created_by, i.created_at, i.updated_at`,
    from: 'items i',
    joins: `
      JOIN item_categories c ON c.id = i.category_id
      JOIN units u ON u.id = i.base_unit_id`,
    conditions,
    params,
    search: filters.search,
    searchFields: ['i.name', 'i.code'],
    orderBy: 'ORDER BY i.name ASC',
    pagination
  });
}

async function findItemById(id) {
  const rows = await query(
    `SELECT id, store_id, category_id, base_unit_id, name, code, item_type, tracking_type, description,
      default_cost, default_selling_price, reorder_level, status, created_by, created_at, updated_at
     FROM items
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createItem(data) {
  const result = await query(
    `INSERT INTO items (
      store_id, category_id, base_unit_id, name, code, item_type, tracking_type, description,
      default_cost, default_selling_price, reorder_level, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.category_id,
      data.base_unit_id,
      data.name,
      data.code,
      data.item_type,
      data.tracking_type || 'stocked',
      nullable(data.description),
      data.default_cost || 0,
      nullable(data.default_selling_price),
      data.reorder_level || 0,
      data.status || 'active',
      nullable(data.created_by)
    ]
  );

  return findItemById(result.insertId);
}

async function updateItem(id, data) {
  return updateById('items', id, data, findItemById);
}

async function countItemMovements(itemId) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM stock_movements sm
     JOIN item_variants iv ON iv.id = sm.item_variant_id
     WHERE iv.item_id = ?`,
    [itemId]
  );

  return Number(rows[0].total);
}

async function deactivateItem(id) {
  const result = await query(
    `UPDATE items
     SET status = 'inactive'
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
}

async function hardDeleteItem(id) {
  const result = await query('DELETE FROM items WHERE id = ?', [id]);
  return result.affectedRows;
}

async function listVariants({ filters, pagination }) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('iv.status = ?');
    params.push(filters.status);
  }

  if (filters.item_id) {
    conditions.push('iv.item_id = ?');
    params.push(filters.item_id);
  }

  if (filters.item_type) {
    conditions.push('i.item_type = ?');
    params.push(filters.item_type);
  }

  if (filters.exclude_item_type) {
    conditions.push('i.item_type <> ?');
    params.push(filters.exclude_item_type);
  }

  if (filters.tracking_type) {
    conditions.push('i.tracking_type = ?');
    params.push(filters.tracking_type);
  }

  if (filters.store_id) {
    conditions.push('iv.store_id = ?');
    params.push(filters.store_id);
  }

  return listWithCount({
    select: `SELECT
      iv.id, iv.store_id, iv.item_id, i.name AS item_name, iv.variant_name, iv.sku, iv.attributes_json,
      iv.cost, iv.selling_price, iv.status, i.item_type, i.tracking_type, i.base_unit_id,
      u.symbol AS base_unit_symbol, iv.created_at, iv.updated_at`,
    from: 'item_variants iv',
    joins: 'JOIN items i ON i.id = iv.item_id JOIN units u ON u.id = i.base_unit_id',
    conditions,
    params,
    search: filters.search,
    searchFields: ['iv.variant_name', 'iv.sku', 'i.name'],
    orderBy: 'ORDER BY i.name ASC, iv.variant_name ASC',
    pagination
  });
}

async function findVariantById(id) {
  const rows = await query(
    `SELECT iv.id, iv.store_id, iv.item_id, iv.variant_name, iv.sku, iv.attributes_json,
       iv.cost, iv.selling_price, iv.status, i.name AS item_name, i.item_type, i.tracking_type, i.base_unit_id,
       u.symbol AS base_unit_symbol, iv.created_at, iv.updated_at
     FROM item_variants iv
     JOIN items i ON i.id = iv.item_id
     JOIN units u ON u.id = i.base_unit_id
     WHERE iv.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createVariant(data) {
  const result = await query(
    `INSERT INTO item_variants (store_id, item_id, variant_name, sku, attributes_json, cost, selling_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.item_id,
      data.variant_name,
      data.sku,
      data.attributes_json ? JSON.stringify(data.attributes_json) : null,
      data.cost || 0,
      nullable(data.selling_price),
      data.status || 'active'
    ]
  );

  return findVariantById(result.insertId);
}

async function updateVariant(id, data) {
  const updateData = { ...data };

  if (updateData.attributes_json !== undefined && updateData.attributes_json !== null) {
    updateData.attributes_json = JSON.stringify(updateData.attributes_json);
  }

  return updateById('item_variants', id, updateData, findVariantById);
}

async function countVariantMovements(variantId) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM stock_movements
     WHERE item_variant_id = ?`,
    [variantId]
  );

  return Number(rows[0].total);
}

async function deactivateVariant(id) {
  const result = await query(
    `UPDATE item_variants
     SET status = 'inactive'
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
}

async function hardDeleteVariant(id) {
  const result = await query('DELETE FROM item_variants WHERE id = ?', [id]);
  return result.affectedRows;
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
    select: `SELECT
      w.id, w.store_id, w.name, w.code, w.location_id, l.name AS location_name, w.address, w.status,
      w.created_at, w.updated_at`,
    from: 'warehouses w',
    joins: 'LEFT JOIN locations l ON l.id = w.location_id',
    conditions,
    params,
    search: filters.search,
    searchFields: ['w.name', 'w.code'],
    orderBy: 'ORDER BY w.name ASC',
    pagination
  });
}

async function findWarehouseById(id) {
  const rows = await query(
    `SELECT id, store_id, name, code, location_id, address, status, created_at, updated_at
     FROM warehouses
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createWarehouse(data) {
  const result = await query(
    `INSERT INTO warehouses (store_id, name, code, location_id, address, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.name,
      data.code,
      nullable(data.location_id),
      nullable(data.address),
      data.status || 'active'
    ]
  );

  return findWarehouseById(result.insertId);
}

async function updateWarehouse(id, data) {
  return updateById('warehouses', id, data, findWarehouseById);
}

async function deactivateWarehouse(id) {
  const result = await query(
    `UPDATE warehouses
     SET status = 'inactive'
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
}

async function listStockBalances({ filters, pagination }) {
  const conditions = [];
  const params = [];

  if (filters.warehouse_id) {
    conditions.push('warehouse_id = ?');
    params.push(filters.warehouse_id);
  }

  if (filters.item_id) {
    conditions.push('item_id = ?');
    params.push(filters.item_id);
  }

  if (filters.item_variant_id) {
    conditions.push('item_variant_id = ?');
    params.push(filters.item_variant_id);
  }

  if (filters.item_type) {
    conditions.push('item_type = ?');
    params.push(filters.item_type);
  }
  if (filters.store_id) {
    conditions.push('store_id = ?');
    params.push(filters.store_id);
  }

  return listWithCount({
    select: 'SELECT *',
    from: 'v_current_stock',
    conditions,
    params,
    search: filters.search,
    searchFields: ['item_name', 'variant_name', 'sku', 'warehouse_name'],
    orderBy: 'ORDER BY warehouse_name ASC, item_name ASC, variant_name ASC',
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

  if (filters.item_variant_id) {
    conditions.push('sm.item_variant_id = ?');
    params.push(filters.item_variant_id);
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
    select: `SELECT
      sm.id, sm.store_id, sm.warehouse_id, w.name AS warehouse_name, sm.item_variant_id, iv.variant_name,
      iv.sku, i.name AS item_name, sm.movement_type, sm.quantity_change, sm.quantity_before,
      sm.quantity_after, sm.reserved_quantity_change, sm.reserved_quantity_before,
      sm.reserved_quantity_after, sm.unit_cost, sm.reference_type, sm.reference_id, sm.notes,
      sm.created_by, sm.created_at`,
    from: 'stock_movements sm',
    joins: `
      JOIN warehouses w ON w.id = sm.warehouse_id
      JOIN item_variants iv ON iv.id = sm.item_variant_id
      JOIN items i ON i.id = iv.item_id`,
    conditions,
    params,
    search: filters.search,
    searchFields: ['i.name', 'iv.variant_name', 'iv.sku', 'sm.reference_type'],
    orderBy: 'ORDER BY sm.created_at DESC, sm.id DESC',
    pagination
  });
}

async function getStockBalanceForUpdate(connection, warehouseId, itemVariantId) {
  const [rows] = await connection.execute(
    `SELECT id, warehouse_id, item_variant_id, quantity_on_hand, quantity_reserved, average_cost
     FROM stock_balances
     WHERE warehouse_id = ? AND item_variant_id = ?
     LIMIT 1
     FOR UPDATE`,
    [warehouseId, itemVariantId]
  );

  return rows[0] || null;
}

async function createStockBalance(connection, warehouseId, itemVariantId, storeId = null) {
  await connection.execute(
    `INSERT INTO stock_balances (
      store_id,
      warehouse_id,
      item_variant_id,
      quantity_on_hand,
      quantity_reserved,
      average_cost
    ) VALUES (?, ?, ?, 0, 0, 0)`,
    [storeId, warehouseId, itemVariantId]
  );

  return getStockBalanceForUpdate(connection, warehouseId, itemVariantId);
}

async function updateStockBalance(connection, id, data) {
  const fields = [];
  const params = [];

  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value);
    }
  }

  if (fields.length === 0) {
    return;
  }

  await connection.execute(
    `UPDATE stock_balances
     SET ${fields.join(', ')}
     WHERE id = ?`,
    [...params, id]
  );
}

async function createStockMovement(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO stock_movements (
      store_id, warehouse_id, item_variant_id, movement_type, quantity_change, quantity_before,
      quantity_after, reserved_quantity_change, reserved_quantity_before, reserved_quantity_after,
      unit_cost, reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.warehouse_id,
      data.item_variant_id,
      data.movement_type,
      data.quantity_change,
      data.quantity_before,
      data.quantity_after,
      data.reserved_quantity_change || 0,
      data.reserved_quantity_before || 0,
      data.reserved_quantity_after || 0,
      nullable(data.unit_cost),
      nullable(data.reference_type),
      nullable(data.reference_id),
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
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

  if (fields.length > 0) {
    await query(
      `UPDATE ${tableName}
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...params, id]
    );
  }

  return findById(id);
}

module.exports = {
  countItemMovements,
  countVariantMovements,
  createCategory,
  createItem,
  createStockBalance,
  createStockMovement,
  createUnit,
  createVariant,
  createWarehouse,
  deactivateCategory,
  deactivateItem,
  deactivateVariant,
  deactivateWarehouse,
  deleteUnit,
  hardDeleteCategory,
  hardDeleteItem,
  hardDeleteVariant,
  findCategoryById,
  findItemById,
  findUnitById,
  findVariantById,
  findWarehouseById,
  getStockBalanceForUpdate,
  listCategories,
  listItems,
  listStockBalances,
  listStockMovements,
  listUnits,
  listVariants,
  listWarehouses,
  updateCategory,
  updateItem,
  updateStockBalance,
  updateUnit,
  updateVariant,
  updateWarehouse
};
