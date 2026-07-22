const { query } = require('../../bootstrap/db');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { nullable } = require('../../utils/crud');

async function execute(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

function buildListFilters(input, definitions) {
  const conditions = [];
  const params = [];
  for (const definition of definitions) {
    const value = input[definition.key];
    if (value === undefined || value === null || value === '') continue;
    if (definition.search) {
      const term = `%${value}%`;
      conditions.push(`(${definition.search.map((field) => `${field} LIKE ?`).join(' OR ')})`);
      params.push(...definition.search.map(() => term));
    } else {
      conditions.push(`${definition.column} = ?`);
      params.push(value);
    }
  }
  return { conditions, params };
}

async function listGroups(input = {}) {
  const pagination = getPagination(input);
  const { conditions, params } = buildListFilters(input, [
    { key: 'store_id', column: 'pg.store_id' },
    { key: 'status', column: 'pg.status' },
    { key: 'input_item_id', column: 'pg.input_item_id' },
    { key: 'search', search: ['pg.name', 'pg.code', 'input_item.name'] }
  ]);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `
    JOIN items input_item ON input_item.id = pg.input_item_id
    LEFT JOIN warehouses w ON w.id = pg.default_warehouse_id`;
  const count = await query(
    `SELECT COUNT(*) AS total
     FROM packaging_groups pg
     ${joins}
     ${where}`,
    params
  );
  const rows = await query(
    `SELECT pg.*, input_item.name AS input_item_name, input_item.stock_mode AS input_stock_mode,
        w.name AS default_warehouse_name,
        COALESCE(component_summary.outer_count, 0) AS outer_component_count,
        COALESCE(component_summary.inner_count, 0) AS inner_component_count,
        COALESCE(component_summary.consumable_count, 0) AS consumable_component_count
     FROM packaging_groups pg
     ${joins}
     LEFT JOIN (
       SELECT packaging_group_id,
         SUM(component_role = 'outer_sellable') AS outer_count,
         SUM(component_role = 'inner_sellable') AS inner_count,
         SUM(component_role = 'consumable') AS consumable_count
       FROM packaging_group_components
       GROUP BY packaging_group_id
     ) component_summary ON component_summary.packaging_group_id = pg.id
     ${where}
     ORDER BY pg.name ASC, pg.id ASC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function findGroupById(id, connection = null) {
  const rows = await execute(connection,
    `SELECT pg.*, input_item.name AS input_item_name, input_item.item_kind AS input_item_kind,
        input_item.stock_mode AS input_stock_mode, input_item.kg_per_carton AS input_kg_per_carton,
        input_item.loose_units_per_carton AS input_loose_units_per_carton,
        w.name AS default_warehouse_name
     FROM packaging_groups pg
     JOIN items input_item ON input_item.id = pg.input_item_id
     LEFT JOIN warehouses w ON w.id = pg.default_warehouse_id
     WHERE pg.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function lockGroupById(connection, id) {
  const [rows] = await connection.execute(
    `SELECT pg.*, input_item.name AS input_item_name, input_item.item_kind AS input_item_kind,
        input_item.stock_mode AS input_stock_mode, input_item.kg_per_carton AS input_kg_per_carton,
        input_item.loose_units_per_carton AS input_loose_units_per_carton,
        input_item.status AS input_item_status
     FROM packaging_groups pg
     JOIN items input_item ON input_item.id = pg.input_item_id
     WHERE pg.id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function getGroupComponents(groupId, connection = null, lock = false) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  const rows = await execute(connection,
    `SELECT pgc.*, i.name AS item_name, i.code AS item_code, i.item_kind, i.stock_mode,
        i.max_content_weight_kg, i.status AS item_status
     FROM packaging_group_components pgc
     JOIN items i ON i.id = pgc.item_id
     WHERE pgc.packaging_group_id = ?
     ORDER BY FIELD(pgc.component_role, 'outer_sellable', 'inner_sellable', 'consumable'), pgc.sort_order ASC, pgc.id ASC${suffix}`,
    [groupId]
  );
  return rows;
}

async function createGroup(data, connection = null) {
  const result = await execute(connection,
    `INSERT INTO packaging_groups (
      store_id, name, code, input_item_id, default_warehouse_id, description, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.name,
      data.code,
      data.input_item_id,
      nullable(data.default_warehouse_id),
      nullable(data.description),
      data.status || 'active',
      nullable(data.created_by)
    ]
  );
  return findGroupById(result.insertId, connection);
}

async function updateGroup(id, data, connection = null) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length) {
    await execute(connection,
      `UPDATE packaging_groups SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => nullable(value)), id]
    );
  }
  return findGroupById(id, connection);
}

async function deactivateGroup(id) {
  const result = await query(
    `UPDATE packaging_groups SET status = 'inactive' WHERE id = ?`,
    [id]
  );
  return result.affectedRows;
}

async function replaceGroupComponents(connection, groupId, storeId, components) {
  await connection.execute(
    'DELETE FROM packaging_group_components WHERE packaging_group_id = ?',
    [groupId]
  );
  for (const [index, component] of components.entries()) {
    await connection.execute(
      `INSERT INTO packaging_group_components (
        store_id, packaging_group_id, item_id, component_role, quantity_per_outer, sort_order, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        storeId,
        groupId,
        component.item_id,
        component.component_role,
        component.quantity_per_outer,
        component.sort_order ?? index,
        nullable(component.notes)
      ]
    );
  }
  return getGroupComponents(groupId, connection);
}

async function listOperations(input = {}) {
  const pagination = getPagination(input);
  const { conditions, params } = buildListFilters(input, [
    { key: 'store_id', column: 'po.store_id' },
    { key: 'packaging_group_id', column: 'po.packaging_group_id' },
    { key: 'warehouse_id', column: 'po.warehouse_id' },
    { key: 'status', column: 'po.status' },
    { key: 'search', search: ['po.operation_number', 'pg.name', 'input_item.name'] }
  ]);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `
    JOIN packaging_groups pg ON pg.id = po.packaging_group_id
    JOIN items input_item ON input_item.id = po.input_item_id
    JOIN warehouses w ON w.id = po.warehouse_id`;
  const count = await query(`SELECT COUNT(*) AS total FROM packaging_operations po ${joins} ${where}`, params);
  const rows = await query(
    `SELECT po.*, pg.name AS packaging_group_name, input_item.name AS input_item_name, w.name AS warehouse_name,
        COUNT(rsc.id) AS container_count,
        SUM(rsc.status = 'full') AS full_container_count,
        SUM(rsc.status = 'partial') AS partial_container_count,
        SUM(rsc.status = 'depleted') AS depleted_container_count
     FROM packaging_operations po
     ${joins}
     LEFT JOIN ready_stock_containers rsc ON rsc.packaging_operation_id = po.id
     ${where}
     GROUP BY po.id
     ORDER BY po.completed_at DESC, po.id DESC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function findOperationById(id, connection = null) {
  const operationRows = await execute(connection,
    `SELECT po.*, pg.name AS packaging_group_name, input_item.name AS input_item_name,
        w.name AS warehouse_name
     FROM packaging_operations po
     JOIN packaging_groups pg ON pg.id = po.packaging_group_id
     JOIN items input_item ON input_item.id = po.input_item_id
     JOIN warehouses w ON w.id = po.warehouse_id
     WHERE po.id = ?
     LIMIT 1`,
    [id]
  );
  const operation = operationRows[0];
  if (!operation) return null;
  const [components, containers] = await Promise.all([
    execute(connection,
      `SELECT poc.*, i.name AS item_name
       FROM packaging_operation_components poc
       JOIN items i ON i.id = poc.item_id
       WHERE poc.packaging_operation_id = ?
       ORDER BY poc.id ASC`,
      [id]
    ),
    listReadyStockContainers({ packaging_operation_id: id, allRows: true }, connection)
  ]);
  return { ...operation, components, containers: containers.rows };
}

async function createOperation(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO packaging_operations (
      store_id, operation_number, packaging_group_id, input_item_id, warehouse_id, output_carton_count,
      raw_quantity_kg, raw_unit_cost, packaging_cost, total_cost, cost_per_outer, cost_per_inner,
      group_snapshot_json, input_snapshot_json, status, completed_by, completed_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      data.store_id,
      data.operation_number,
      data.packaging_group_id,
      data.input_item_id,
      data.warehouse_id,
      data.output_carton_count,
      data.raw_quantity_kg,
      data.raw_unit_cost,
      data.packaging_cost,
      data.total_cost,
      data.cost_per_outer,
      data.cost_per_inner,
      JSON.stringify(data.group_snapshot_json || {}),
      JSON.stringify(data.input_snapshot_json || {}),
      data.status || 'completed',
      data.completed_by,
      nullable(data.notes)
    ]
  );
  return result.insertId;
}

async function createOperationComponent(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO packaging_operation_components (
      packaging_operation_id, item_id, component_role, quantity_per_outer, required_quantity,
      consumed_quantity, unit_cost, total_cost, component_snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.packaging_operation_id,
      data.item_id,
      data.component_role,
      data.quantity_per_outer,
      data.required_quantity,
      data.consumed_quantity,
      data.unit_cost,
      data.total_cost,
      JSON.stringify(data.component_snapshot_json || {})
    ]
  );
  return result.insertId;
}

async function createReadyStockContainer(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO ready_stock_containers (
      store_id, packaging_operation_id, packaging_group_id, warehouse_id, outer_item_id, inner_item_id,
      outer_name_snapshot, inner_name_snapshot, initial_inner_quantity, remaining_inner_quantity,
      capacity_kg, total_cost, remaining_cost, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.packaging_operation_id,
      data.packaging_group_id,
      data.warehouse_id,
      data.outer_item_id,
      data.inner_item_id,
      data.outer_name_snapshot,
      data.inner_name_snapshot,
      data.initial_inner_quantity,
      data.remaining_inner_quantity,
      data.capacity_kg,
      data.total_cost,
      data.remaining_cost,
      data.status || 'full'
    ]
  );
  return result.insertId;
}

async function listReadyStockContainers(input = {}, connection = null) {
  const pagination = getPagination(input);
  const { conditions, params } = buildListFilters(input, [
    { key: 'store_id', column: 'rsc.store_id' },
    { key: 'warehouse_id', column: 'rsc.warehouse_id' },
    { key: 'packaging_group_id', column: 'rsc.packaging_group_id' },
    { key: 'packaging_operation_id', column: 'rsc.packaging_operation_id' },
    { key: 'status', column: 'rsc.status' },
    { key: 'search', search: ['rsc.outer_name_snapshot', 'rsc.inner_name_snapshot', 'po.operation_number', 'pg.name'] }
  ]);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `
    JOIN packaging_operations po ON po.id = rsc.packaging_operation_id
    JOIN packaging_groups pg ON pg.id = rsc.packaging_group_id
    JOIN warehouses w ON w.id = rsc.warehouse_id`;
  const executor = connection ? (sql, values) => execute(connection, sql, values) : query;
  const count = await executor(`SELECT COUNT(*) AS total FROM ready_stock_containers rsc ${joins} ${where}`, params);
  const rows = await executor(
    `SELECT rsc.*, po.operation_number, pg.name AS packaging_group_name, w.name AS warehouse_name,
        (rsc.remaining_inner_quantity / NULLIF(rsc.initial_inner_quantity, 0)) AS remaining_ratio
     FROM ready_stock_containers rsc
     ${joins}
     ${where}
     ORDER BY FIELD(rsc.status, 'full', 'partial', 'depleted', 'cancelled'), rsc.created_at ASC, rsc.id ASC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function lockReadyStockContainer(connection, id) {
  const [rows] = await connection.execute(
    `SELECT * FROM ready_stock_containers WHERE id = ? LIMIT 1 FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function lockReadyContainersForAllocation(connection, warehouseId, packagingGroupId, status, limit = null) {
  const params = [warehouseId, packagingGroupId, status];
  const limitClause = limit ? 'LIMIT ?' : '';
  if (limit) params.push(limit);
  const [rows] = await connection.execute(
    `SELECT *
     FROM ready_stock_containers
     WHERE warehouse_id = ? AND packaging_group_id = ? AND status = ?
     ORDER BY created_at ASC, id ASC
     ${limitClause}
     FOR UPDATE`,
    params
  );
  return rows;
}

async function updateReadyStockContainer(connection, id, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (!entries.length) return lockReadyStockContainer(connection, id);
  await connection.execute(
    `UPDATE ready_stock_containers SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
    [...entries.map(([, value]) => nullable(value)), id]
  );
  return lockReadyStockContainer(connection, id);
}

async function createReadyStockMovement(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO ready_stock_movements (
      store_id, warehouse_id, ready_stock_container_id, movement_type,
      inner_quantity_change, inner_quantity_before, inner_quantity_after,
      cost_change, cost_before, cost_after, reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.warehouse_id,
      data.ready_stock_container_id,
      data.movement_type,
      data.inner_quantity_change,
      data.inner_quantity_before,
      data.inner_quantity_after,
      data.cost_change,
      data.cost_before,
      data.cost_after,
      nullable(data.reference_type),
      nullable(data.reference_id),
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );
  return result.insertId;
}

async function listSaleCatalogEntries(input = {}) {
  const pagination = getPagination(input);
  const { conditions, params } = buildListFilters(input, [
    { key: 'store_id', column: 'sce.store_id' },
    { key: 'entry_type', column: 'sce.entry_type' },
    { key: 'item_id', column: 'sce.item_id' },
    { key: 'packaging_group_id', column: 'sce.packaging_group_id' },
    { key: 'status', column: 'sce.status' },
    { key: 'is_pos_active', column: 'sce.is_pos_active' },
    { key: 'search', search: ['sce.display_name', 'item.name', 'pg.name'] }
  ]);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `
    LEFT JOIN items item ON item.id = sce.item_id
    LEFT JOIN packaging_groups pg ON pg.id = sce.packaging_group_id`;
  const count = await query(`SELECT COUNT(*) AS total FROM sale_catalog_entries sce ${joins} ${where}`, params);
  const rows = await query(
    `SELECT sce.*, item.name AS item_name, item.stock_mode AS item_stock_mode,
        pg.name AS packaging_group_name
     FROM sale_catalog_entries sce
     ${joins}
     ${where}
     ORDER BY sce.display_name ASC, sce.id ASC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function findSaleCatalogEntryById(id, connection = null) {
  const rows = await execute(connection,
    `SELECT sce.*, item.name AS item_name, item.item_kind AS item_kind, item.stock_mode AS item_stock_mode,
        item.kg_per_carton, item.loose_units_per_carton, item.status AS item_status,
        pg.name AS packaging_group_name, pg.status AS packaging_group_status
     FROM sale_catalog_entries sce
     LEFT JOIN items item ON item.id = sce.item_id
     LEFT JOIN packaging_groups pg ON pg.id = sce.packaging_group_id
     WHERE sce.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findActiveSaleCatalogDuplicate(connection, data, excludeId = null) {
  const conditions = [
    'store_id = ?',
    'entry_type = ?',
    "status = 'active'"
  ];
  const params = [data.store_id, data.entry_type];
  if (data.item_id) {
    conditions.push('item_id = ?');
    params.push(data.item_id);
  } else {
    conditions.push('packaging_group_id = ?');
    params.push(data.packaging_group_id);
  }
  if (excludeId) {
    conditions.push('id <> ?');
    params.push(excludeId);
  }
  const rows = await execute(connection,
    `SELECT * FROM sale_catalog_entries WHERE ${conditions.join(' AND ')} LIMIT 1`,
    params
  );
  return rows[0] || null;
}

async function createSaleCatalogEntry(data, connection = null) {
  const result = await execute(connection,
    `INSERT INTO sale_catalog_entries (
      store_id, entry_type, item_id, packaging_group_id, display_name, unit_label,
      default_price, vat_rate, is_pos_active, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.entry_type,
      nullable(data.item_id),
      nullable(data.packaging_group_id),
      data.display_name,
      data.unit_label,
      data.default_price,
      data.vat_rate || 0,
      data.is_pos_active ? 1 : 0,
      data.status || 'active',
      nullable(data.created_by)
    ]
  );
  return findSaleCatalogEntryById(result.insertId, connection);
}

async function updateSaleCatalogEntry(id, data, connection = null) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length) {
    await execute(connection,
      `UPDATE sale_catalog_entries SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => typeof value === 'boolean' ? Number(value) : nullable(value)), id]
    );
  }
  return findSaleCatalogEntryById(id, connection);
}

module.exports = {
  createGroup,
  createOperation,
  createOperationComponent,
  createReadyStockContainer,
  createReadyStockMovement,
  createSaleCatalogEntry,
  deactivateGroup,
  findGroupById,
  findOperationById,
  findActiveSaleCatalogDuplicate,
  findSaleCatalogEntryById,
  getGroupComponents,
  listGroups,
  listOperations,
  listReadyStockContainers,
  listSaleCatalogEntries,
  lockGroupById,
  lockReadyStockContainer,
  lockReadyContainersForAllocation,
  replaceGroupComponents,
  updateGroup,
  updateReadyStockContainer,
  updateSaleCatalogEntry
};
