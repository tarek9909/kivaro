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

  if (filters.tracking_type) {
    conditions.push('i.tracking_type = ?');
    params.push(filters.tracking_type);
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
      i.id, i.store_id, i.category_id, c.name AS category_name, i.base_unit_id,
      u.symbol AS base_unit_symbol, u.unit_type AS base_unit_type,
      u.conversion_to_base AS base_unit_conversion_to_base,
      i.name, i.code, i.item_type, i.tracking_type, i.description, i.default_cost,
      i.default_selling_price, i.reorder_level, i.status,
      COALESCE(item_stock.quantity_on_hand, 0) AS item_quantity_on_hand,
      COALESCE(item_stock.quantity_allocated, 0) AS item_quantity_allocated,
      i.created_by, i.created_at, i.updated_at`,
    from: 'items i',
    joins: `
      JOIN item_categories c ON c.id = i.category_id
      JOIN units u ON u.id = i.base_unit_id
      LEFT JOIN (
        SELECT item_id, SUM(quantity_on_hand) AS quantity_on_hand, SUM(quantity_allocated) AS quantity_allocated
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
  const sql = `SELECT i.id, i.store_id, i.category_id, i.base_unit_id, u.symbol AS base_unit_symbol,
      u.unit_type AS base_unit_type, u.conversion_to_base AS base_unit_conversion_to_base,
      i.name, i.code, i.item_type, i.tracking_type, i.description,
      i.default_cost, i.default_selling_price, i.reorder_level, i.status, i.created_by, i.created_at, i.updated_at
     FROM items i
     JOIN units u ON u.id = i.base_unit_id
     WHERE i.id = ?
     LIMIT 1`;
  const rows = connection
    ? (await connection.execute(sql, [id]))[0]
    : await query(sql, [id]);

  return rows[0] || null;
}

async function createItem(data, connection = null) {
  const executor = connection || { execute: (sql, params) => query(sql, params).then((result) => [result]) };
  const [result] = await executor.execute(
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

  return findItemById(result.insertId, connection);
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

function placeholders(values) {
  return values.map(() => '?').join(', ');
}

async function execute(connection, sql, params = []) {
  if (connection) {
    const [result] = await connection.execute(sql, params);
    return result;
  }

  return query(sql, params);
}

async function selectColumn(connection, sql, params = [], column = 'id') {
  const rows = connection
    ? (await connection.execute(sql, params))[0]
    : await query(sql, params);

  return rows.map((row) => row[column]);
}

async function deleteWhereIn(connection, tableName, columnName, values) {
  if (!values.length) return 0;
  const result = await execute(
    connection,
    `DELETE FROM ${tableName} WHERE ${columnName} IN (${placeholders(values)})`,
    values
  );
  return result.affectedRows || 0;
}

async function hardDeleteItemCascade(id, connection = null) {
  const variantIds = await selectColumn(
    connection,
    'SELECT id FROM item_variants WHERE item_id = ?',
    [id]
  );

  if (!variantIds.length) {
    await execute(connection, 'DELETE FROM item_stock_balances WHERE item_id = ?', [id]);
    const result = await execute(connection, 'DELETE FROM items WHERE id = ?', [id]);
    return { itemDeleted: result.affectedRows || 0, variantCount: 0 };
  }

  const variantList = placeholders(variantIds);
  const packagingAssignmentIds = await selectColumn(
    connection,
    `SELECT id
     FROM packaging_group_assignments
     WHERE charcoal_variant_id IN (${variantList})
        OR output_item_variant_id IN (${variantList})`,
    [...variantIds, ...variantIds]
  );
  const dispatchItemIds = await selectColumn(
    connection,
    `SELECT id
     FROM dispatch_items
     WHERE item_variant_id IN (${variantList})
        ${packagingAssignmentIds.length ? `OR packaging_assignment_id IN (${placeholders(packagingAssignmentIds)})` : ''}`,
    packagingAssignmentIds.length ? [...variantIds, ...packagingAssignmentIds] : variantIds
  );
  const purchaseOrderItemIds = await selectColumn(
    connection,
    `SELECT id FROM purchase_order_items WHERE item_variant_id IN (${variantList})`,
    variantIds
  );
  const outputConfigIds = await selectColumn(
    connection,
    `SELECT id FROM packaging_configurations WHERE output_item_variant_id IN (${variantList})`,
    variantIds
  );
  const productionBatchIds = await selectColumn(
    connection,
    `SELECT id
     FROM production_batches
     WHERE output_item_variant_id IN (${variantList})
        OR charcoal_variant_id IN (${variantList})
        ${outputConfigIds.length ? `OR packaging_configuration_id IN (${placeholders(outputConfigIds)})` : ''}`,
    outputConfigIds.length ? [...variantIds, ...variantIds, ...outputConfigIds] : [...variantIds, ...variantIds]
  );
  const packagingGroupIds = await selectColumn(
    connection,
    `SELECT DISTINCT packaging_group_id
     FROM packaging_group_components
     WHERE item_variant_id IN (${variantList})`,
    variantIds,
    'packaging_group_id'
  );

  if (dispatchItemIds.length) {
    await execute(
      connection,
      `DELETE FROM dispatch_returns
       WHERE dispatch_item_id IN (${placeholders(dispatchItemIds)})
          OR item_variant_id IN (${variantList})`,
      [...dispatchItemIds, ...variantIds]
    );
  } else {
    await execute(
      connection,
      `DELETE FROM dispatch_returns WHERE item_variant_id IN (${variantList})`,
      variantIds
    );
  }
  await deleteWhereIn(connection, 'dispatch_items', 'id', dispatchItemIds);

  if (purchaseOrderItemIds.length) {
    await execute(
      connection,
      `DELETE FROM purchase_receipt_items
       WHERE purchase_order_item_id IN (${placeholders(purchaseOrderItemIds)})
          OR item_variant_id IN (${variantList})`,
      [...purchaseOrderItemIds, ...variantIds]
    );
  } else {
    await execute(
      connection,
      `DELETE FROM purchase_receipt_items WHERE item_variant_id IN (${variantList})`,
      variantIds
    );
  }
  await deleteWhereIn(connection, 'purchase_order_items', 'id', purchaseOrderItemIds);

  await deleteWhereIn(connection, 'production_batches', 'id', productionBatchIds);
  await execute(
    connection,
    `DELETE FROM production_batch_components WHERE component_item_variant_id IN (${variantList})`,
    variantIds
  );
  await execute(
    connection,
    `DELETE FROM packaging_configuration_components WHERE component_item_variant_id IN (${variantList})`,
    variantIds
  );
  await deleteWhereIn(connection, 'packaging_configurations', 'id', outputConfigIds);
  await execute(
    connection,
    `DELETE FROM product_cost_history WHERE item_variant_id IN (${variantList})`,
    variantIds
  );

  if (packagingGroupIds.length) {
    await execute(
      connection,
      `UPDATE packaging_group_components
       SET parent_component_id = NULL
       WHERE packaging_group_id IN (${placeholders(packagingGroupIds)})`,
      packagingGroupIds
    );
    await execute(
      connection,
      `DELETE FROM packaging_group_components
       WHERE packaging_group_id IN (${placeholders(packagingGroupIds)})`,
      packagingGroupIds
    );
  }

  await deleteWhereIn(connection, 'packaging_group_assignments', 'id', packagingAssignmentIds);
  await execute(
    connection,
    `UPDATE packaging_groups SET charcoal_variant_id = NULL WHERE charcoal_variant_id IN (${variantList})`,
    variantIds
  );
  await execute(connection, `DELETE FROM stock_movements WHERE item_variant_id IN (${variantList})`, variantIds);
  await execute(connection, `DELETE FROM stock_balances WHERE item_variant_id IN (${variantList})`, variantIds);
  await execute(connection, 'DELETE FROM item_stock_balances WHERE item_id = ?', [id]);
  await execute(connection, `DELETE FROM item_variants WHERE id IN (${variantList})`, variantIds);
  const result = await execute(connection, 'DELETE FROM items WHERE id = ?', [id]);

  return { itemDeleted: result.affectedRows || 0, variantCount: variantIds.length };
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
      u.symbol AS base_unit_symbol, u.unit_type AS base_unit_type,
      u.conversion_to_base AS base_unit_conversion_to_base,
      COALESCE(variant_stock.quantity_on_hand, 0) AS quantity_on_hand,
      COALESCE(variant_stock.quantity_available, 0) AS quantity_available,
      iv.created_at, iv.updated_at`,
    from: 'item_variants iv',
    joins: `JOIN items i ON i.id = iv.item_id
      JOIN units u ON u.id = i.base_unit_id
      LEFT JOIN (
        SELECT item_variant_id,
          SUM(quantity_on_hand) AS quantity_on_hand,
          SUM(quantity_on_hand - quantity_reserved) AS quantity_available
        FROM stock_balances
        GROUP BY item_variant_id
      ) variant_stock ON variant_stock.item_variant_id = iv.id`,
    conditions,
    params,
    search: filters.search,
    searchFields: ['iv.variant_name', 'iv.sku', 'i.name'],
    orderBy: 'ORDER BY i.name ASC, iv.variant_name ASC',
    pagination
  });
}

async function findVariantById(id, connection = null) {
  const sql = `SELECT iv.id, iv.store_id, iv.item_id, iv.variant_name, iv.sku, iv.attributes_json,
       iv.cost, iv.selling_price, iv.status, i.name AS item_name, i.item_type, i.tracking_type, i.base_unit_id,
       u.symbol AS base_unit_symbol, u.unit_type AS base_unit_type,
       u.conversion_to_base AS base_unit_conversion_to_base, iv.created_at, iv.updated_at
     FROM item_variants iv
     JOIN items i ON i.id = iv.item_id
     JOIN units u ON u.id = i.base_unit_id
     WHERE iv.id = ?
     LIMIT 1`;
  const rows = connection
    ? (await connection.execute(sql, [id]))[0]
    : await query(sql, [id]);

  return rows[0] || null;
}

async function findActiveStockedVariantByItemId(itemId, connection = null) {
  const sql = `SELECT iv.id, iv.store_id, iv.item_id, iv.variant_name, iv.sku, iv.attributes_json,
       iv.cost, iv.selling_price, iv.status, i.name AS item_name, i.item_type, i.tracking_type, i.base_unit_id,
       u.symbol AS base_unit_symbol, u.unit_type AS base_unit_type,
       u.conversion_to_base AS base_unit_conversion_to_base, iv.created_at, iv.updated_at
     FROM item_variants iv
     JOIN items i ON i.id = iv.item_id
     JOIN units u ON u.id = i.base_unit_id
     WHERE iv.item_id = ?
       AND iv.status = 'active'
       AND i.status = 'active'
       AND i.tracking_type = 'stocked'
     ORDER BY iv.id ASC
     LIMIT 1`;
  const rows = connection
    ? (await connection.execute(sql, [itemId]))[0]
    : await query(sql, [itemId]);

  return rows[0] || null;
}

async function createVariant(data, connection = null) {
  const executor = connection || { execute: (sql, params) => query(sql, params).then((result) => [result]) };
  const [result] = await executor.execute(
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

  return findVariantById(result.insertId, connection);
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
  const stockConditions = [];
  const stockParams = [];
  const batchConditions = ["pga.status IN ('batched', 'consumed')"];
  const batchParams = [];

  if (filters.warehouse_id) {
    stockConditions.push('warehouse_id = ?');
    stockParams.push(filters.warehouse_id);
    batchConditions.push('pga.warehouse_id = ?');
    batchParams.push(filters.warehouse_id);
  }

  if (filters.item_id) {
    stockConditions.push('item_id = ?');
    stockParams.push(filters.item_id);
    batchConditions.push('1 = 0');
  }

  if (filters.item_variant_id) {
    stockConditions.push('item_variant_id = ?');
    stockParams.push(filters.item_variant_id);
    batchConditions.push('pga.output_item_variant_id = ?');
    batchParams.push(filters.item_variant_id);
  }

  if (filters.item_type) {
    stockConditions.push('item_type = ?');
    stockParams.push(filters.item_type);
    batchConditions.push('1 = 0');
  }
  if (filters.store_id) {
    stockConditions.push('store_id = ?');
    stockParams.push(filters.store_id);
    batchConditions.push('pga.store_id = ?');
    batchParams.push(filters.store_id);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    stockConditions.push('(item_name LIKE ? OR variant_name LIKE ? OR sku LIKE ? OR warehouse_name LIKE ?)');
    stockParams.push(term, term, term, term);
    batchConditions.push(`(pg.name LIKE ? OR w.name LIKE ? OR cv.variant_name LIKE ? OR CONCAT('PA-', pga.id) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.primary_container_name')) LIKE ?)`);
    batchParams.push(term, term, term, term, term);
  }

  const stockWhere = stockConditions.length ? `WHERE ${stockConditions.join(' AND ')}` : '';
  const batchWhere = batchConditions.length ? `WHERE ${batchConditions.join(' AND ')}` : '';
  const stockSelect = `SELECT
      stock_balance_id,
      CONCAT('stock-', stock_balance_id) AS row_key,
      'stock_balance' AS source_type,
      NULL AS packaging_assignment_id,
      store_id,
      warehouse_id,
      warehouse_name,
      item_id,
      item_name,
      item_type,
      unit_type,
      item_variant_id,
      variant_name,
      sku,
      unit_symbol,
      quantity_on_hand,
      quantity_reserved,
      quantity_available,
      average_cost,
      stock_value
    FROM v_current_stock
    ${stockWhere}`;
  const batchSelect = `SELECT
      NULL AS stock_balance_id,
      CONCAT('packaging-', pga.id) AS row_key,
      'packaging_batch' AS source_type,
      pga.id AS packaging_assignment_id,
      pga.store_id,
      pga.warehouse_id,
      w.name AS warehouse_name,
      NULL AS item_id,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.primary_container_item_name')), pg.name) AS item_name,
      'packaged' AS item_type,
      'quantity' AS unit_type,
      pga.output_item_variant_id AS item_variant_id,
      COALESCE(ov.variant_name, JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.primary_container_variant_name')), JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.primary_container_name'))) AS variant_name,
      CONCAT('PA-', pga.id) AS sku,
      'pc' AS unit_symbol,
      pga.produced_quantity AS quantity_on_hand,
      CASE
        WHEN COALESCE(batch_movements.movement_count, 0) > 0 THEN COALESCE(batch_movements.allocated_quantity, 0)
        ELSE COALESCE(allocated.allocated_quantity, 0)
      END AS quantity_reserved,
      GREATEST(pga.produced_quantity - CASE
        WHEN COALESCE(batch_movements.movement_count, 0) > 0 THEN COALESCE(batch_movements.allocated_quantity, 0)
        ELSE COALESCE(allocated.allocated_quantity, 0)
      END, 0) AS quantity_available,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.cost_per_primary_container')), JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.cost_per_packaging_group')), pga.cost_per_kg) AS average_cost,
      pga.produced_quantity * COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.cost_per_primary_container')), JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.cost_per_packaging_group')), pga.cost_per_kg) AS stock_value
    FROM packaging_group_assignments pga
    JOIN packaging_groups pg ON pg.id = pga.packaging_group_id
    JOIN warehouses w ON w.id = pga.warehouse_id
    JOIN item_variants cv ON cv.id = pga.charcoal_variant_id
    LEFT JOIN item_variants ov ON ov.id = pga.output_item_variant_id
    LEFT JOIN (
      SELECT di.packaging_assignment_id,
        SUM(di.quantity - di.returned_quantity) AS allocated_quantity
      FROM dispatch_items di
      JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
      WHERE di.packaging_assignment_id IS NOT NULL
        AND dr.status <> 'cancelled'
      GROUP BY di.packaging_assignment_id
    ) allocated ON allocated.packaging_assignment_id = pga.id
    LEFT JOIN (
      SELECT packaging_assignment_id,
        COUNT(*) AS movement_count,
        GREATEST(-SUM(quantity_change), 0) AS allocated_quantity
      FROM packaging_batch_movements
      GROUP BY packaging_assignment_id
    ) batch_movements ON batch_movements.packaging_assignment_id = pga.id
    ${batchWhere}`;
  const params = [...stockParams, ...batchParams];
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM (${stockSelect} UNION ALL ${batchSelect}) stock`,
    params
  );
  const rows = await query(
    `SELECT * FROM (${stockSelect} UNION ALL ${batchSelect}) stock
     ORDER BY warehouse_name ASC, item_name ASC, variant_name ASC
     LIMIT ? OFFSET ?`,
    [...params, pagination.limit, pagination.offset]
  );

  return {
    rows,
    total: Number(countRows[0]?.total || 0),
    batchSummary: await getBatchStockSummary(batchSelect, batchParams)
  };
}

async function getBatchStockSummary(batchSelect, params) {
  const rows = await query(
    `SELECT
       COUNT(*) AS batch_count,
       COALESCE(SUM(quantity_on_hand), 0) AS total_batch_stock,
       COALESCE(SUM(quantity_reserved), 0) AS total_batch_allocated,
       COALESCE(SUM(quantity_available), 0) AS total_batch_remaining,
       COALESCE(SUM(stock_value), 0) AS total_batch_value
     FROM (${batchSelect}) batches`,
    params
  ) || [];

  return {
    batch_count: Number(rows[0]?.batch_count || 0),
    total_batch_stock: rows[0]?.total_batch_stock || '0.0000',
    total_batch_allocated: rows[0]?.total_batch_allocated || '0.0000',
    total_batch_remaining: rows[0]?.total_batch_remaining || '0.0000',
    total_batch_value: rows[0]?.total_batch_value || '0.0000'
  };
}

async function listStockMovements({ filters, pagination }) {
  const stockConditions = [];
  const stockParams = [];
  const batchConditions = [];
  const batchParams = [];

  if (filters.warehouse_id) {
    stockConditions.push('sm.warehouse_id = ?');
    stockParams.push(filters.warehouse_id);
    batchConditions.push('bm.warehouse_id = ?');
    batchParams.push(filters.warehouse_id);
  }

  if (filters.item_variant_id) {
    stockConditions.push('sm.item_variant_id = ?');
    stockParams.push(filters.item_variant_id);
    batchConditions.push('bm.item_variant_id = ?');
    batchParams.push(filters.item_variant_id);
  }

  if (filters.movement_type) {
    if (filters.movement_type === 'batch_movement') {
      stockConditions.push('1 = 0');
      batchConditions.push('bm.movement_type = ?');
      batchParams.push(filters.movement_type);
    } else {
      stockConditions.push('sm.movement_type = ?');
      stockParams.push(filters.movement_type);
      batchConditions.push('1 = 0');
    }
  }

  if (filters.reference_type) {
    stockConditions.push('sm.reference_type = ?');
    stockParams.push(filters.reference_type);
    batchConditions.push('bm.reference_type = ?');
    batchParams.push(filters.reference_type);
  }
  if (filters.store_id) {
    stockConditions.push('sm.store_id = ?');
    stockParams.push(filters.store_id);
    batchConditions.push('bm.store_id = ?');
    batchParams.push(filters.store_id);
  }

  if (filters.date_from) {
    stockConditions.push('DATE(sm.created_at) >= ?');
    stockParams.push(filters.date_from);
    batchConditions.push('DATE(bm.created_at) >= ?');
    batchParams.push(filters.date_from);
  }

  if (filters.date_to) {
    stockConditions.push('DATE(sm.created_at) <= ?');
    stockParams.push(filters.date_to);
    batchConditions.push('DATE(bm.created_at) <= ?');
    batchParams.push(filters.date_to);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    stockConditions.push('(i.name LIKE ? OR iv.variant_name LIKE ? OR iv.sku LIKE ? OR sm.reference_type LIKE ?)');
    stockParams.push(term, term, term, term);
    batchConditions.push(`(pg.name LIKE ? OR ov.variant_name LIKE ? OR ov.sku LIKE ? OR CONCAT('PA-', pga.id) LIKE ? OR bm.reference_type LIKE ?)`);
    batchParams.push(term, term, term, term, term);
  }

  const stockWhere = stockConditions.length ? `WHERE ${stockConditions.join(' AND ')}` : '';
  const batchWhere = batchConditions.length ? `WHERE ${batchConditions.join(' AND ')}` : '';
  const stockSelect = `SELECT
      CONCAT('stock-', sm.id) AS id,
      sm.id AS movement_id, sm.store_id, sm.warehouse_id, w.name AS warehouse_name, sm.item_variant_id, iv.variant_name,
      iv.sku, i.name AS item_name, sm.movement_type, sm.quantity_change, sm.quantity_before,
      sm.quantity_after, sm.reserved_quantity_change, sm.reserved_quantity_before,
      sm.reserved_quantity_after, sm.unit_cost, sm.reference_type, sm.reference_id, sm.notes,
      CASE WHEN u.unit_type = 'weight' THEN 'kg' ELSE u.symbol END AS base_unit_symbol,
      u.unit_type AS base_unit_type, sm.created_by, sm.created_at
    FROM stock_movements sm
      JOIN warehouses w ON w.id = sm.warehouse_id
      JOIN item_variants iv ON iv.id = sm.item_variant_id
      JOIN items i ON i.id = iv.item_id
      JOIN units u ON u.id = i.base_unit_id
    ${stockWhere}`;
  const batchSelect = `SELECT
      CONCAT('batch-', bm.id) AS id,
      bm.id AS movement_id,
      bm.store_id,
      bm.warehouse_id,
      w.name AS warehouse_name,
      bm.item_variant_id,
      COALESCE(ov.variant_name, JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.primary_container_variant_name')), JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.primary_container_name'))) AS variant_name,
      COALESCE(ov.sku, CONCAT('PA-', pga.id)) AS sku,
      COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pga.calculation_json, '$.primary_container_item_name')), pg.name) AS item_name,
      bm.movement_type,
      bm.quantity_change,
      bm.quantity_before,
      bm.quantity_after,
      0 AS reserved_quantity_change,
      0 AS reserved_quantity_before,
      0 AS reserved_quantity_after,
      bm.unit_cost,
      bm.reference_type,
      bm.reference_id,
      bm.notes,
      'pc' AS base_unit_symbol,
      'quantity' AS base_unit_type,
      bm.created_by,
      bm.created_at
    FROM packaging_batch_movements bm
      JOIN packaging_group_assignments pga ON pga.id = bm.packaging_assignment_id
      JOIN packaging_groups pg ON pg.id = pga.packaging_group_id
      JOIN warehouses w ON w.id = bm.warehouse_id
      LEFT JOIN item_variants ov ON ov.id = bm.item_variant_id
    ${batchWhere}`;
  const params = [...stockParams, ...batchParams];

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM (${stockSelect} UNION ALL ${batchSelect}) movements`,
    params
  );
  const rows = await query(
    `SELECT * FROM (${stockSelect} UNION ALL ${batchSelect}) movements
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.limit, pagination.offset]
  );

  return {
    rows,
    total: Number(countRows[0]?.total || 0)
  };
}

async function listStockAdjustments({ filters, pagination }) {
  const conditions = [];
  const params = [];

  if (filters.warehouse_id) {
    conditions.push('warehouse_id = ?');
    params.push(filters.warehouse_id);
  }
  if (filters.store_id) {
    conditions.push('store_id = ?');
    params.push(filters.store_id);
  }
  if (filters.item_type) {
    conditions.push('item_type = ?');
    params.push(filters.item_type);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const baseSql = `
    SELECT *
    FROM (
      SELECT
        CONCAT('variant-', sm.id) AS id,
        'variant' AS target_type,
        sm.store_id,
        sm.warehouse_id,
        w.name AS warehouse_name,
        i.id AS item_id,
        i.name AS item_name,
        i.item_type,
        sm.item_variant_id,
        iv.variant_name,
        iv.sku,
        sm.quantity_change,
        sm.quantity_before,
        sm.quantity_after,
        sm.unit_cost,
        sm.notes,
        CASE WHEN u.unit_type = 'weight' THEN 'kg' ELSE u.symbol END AS base_unit_symbol,
        u.unit_type AS base_unit_type,
        sm.created_by,
        sm.created_at
      FROM stock_movements sm
      JOIN warehouses w ON w.id = sm.warehouse_id
      JOIN item_variants iv ON iv.id = sm.item_variant_id
      JOIN items i ON i.id = iv.item_id
      JOIN units u ON u.id = i.base_unit_id
      WHERE sm.movement_type = 'adjustment'
      UNION ALL
      SELECT
        CONCAT('item-', isa.id) AS id,
        'item' AS target_type,
        isa.store_id,
        isa.warehouse_id,
        w.name AS warehouse_name,
        i.id AS item_id,
        i.name AS item_name,
        i.item_type,
        NULL AS item_variant_id,
        'Item pool' AS variant_name,
        i.code AS sku,
        isa.quantity_change,
        isa.quantity_before,
        isa.quantity_after,
        isa.unit_cost,
        isa.notes,
        CASE WHEN u.unit_type = 'weight' THEN 'kg' ELSE u.symbol END AS base_unit_symbol,
        u.unit_type AS base_unit_type,
        isa.created_by,
        isa.created_at
      FROM item_stock_adjustments isa
      JOIN warehouses w ON w.id = isa.warehouse_id
      JOIN items i ON i.id = isa.item_id
      JOIN units u ON u.id = i.base_unit_id
    ) adjustments`;
  const countRows = await query(
    `SELECT COUNT(*) AS total FROM (${baseSql}) counted ${whereClause}`,
    params
  );
  const rows = await query(
    `${baseSql}
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.limit, pagination.offset]
  );

  return {
    rows,
    total: Number(countRows[0].total)
  };
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

async function getItemStockBalanceForUpdate(connection, warehouseId, itemId) {
  const [rows] = await connection.execute(
    `SELECT id, store_id, warehouse_id, item_id, quantity_on_hand, quantity_allocated
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
      store_id,
      warehouse_id,
      item_id,
      quantity_on_hand,
      quantity_allocated
    ) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand),
      quantity_allocated = quantity_allocated + VALUES(quantity_allocated)`,
    [
      nullable(data.store_id),
      data.warehouse_id,
      data.item_id,
      data.quantity_on_hand || 0,
      data.quantity_allocated || 0
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
    quantity_allocated: 0
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

  if (fields.length === 0) {
    return;
  }

  await connection.execute(
    `UPDATE item_stock_balances
     SET ${fields.join(', ')}
     WHERE id = ?`,
    [...params, id]
  );
}

async function createItemStockAdjustment(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO item_stock_adjustments (
      store_id,
      warehouse_id,
      item_id,
      quantity_change,
      quantity_before,
      quantity_after,
      unit_cost,
      notes,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.warehouse_id,
      data.item_id,
      data.quantity_change,
      data.quantity_before,
      data.quantity_after,
      nullable(data.unit_cost),
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
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
  createItemStockBalance,
  createItemStockAdjustment,
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
  hardDeleteItemCascade,
  hardDeleteVariant,
  findCategoryById,
  findActiveStockedVariantByItemId,
  findItemById,
  findUnitById,
  findVariantById,
  findWarehouseById,
  getItemStockBalanceForUpdate,
  getOrCreateItemStockBalanceForUpdate,
  getStockBalanceForUpdate,
  listCategories,
  listItems,
  listStockBalances,
  listStockAdjustments,
  listStockMovements,
  listUnits,
  listVariants,
  listWarehouses,
  updateCategory,
  updateItem,
  updateItemStockBalance,
  updateStockBalance,
  updateUnit,
  updateVariant,
  updateWarehouse
};
