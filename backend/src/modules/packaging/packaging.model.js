const { query } = require('../../bootstrap/db');
const { insertRecord, listRecords, updateRecord } = require('../../utils/crud');

const groupSelect = `SELECT
  pg.id, pg.store_id, pg.name, pg.code, pg.charcoal_variant_id,
  cv.variant_name AS charcoal_variant_name, cv.sku AS charcoal_sku,
  pg.default_warehouse_id, w.name AS default_warehouse_name,
  pg.description, pg.status, pg.created_by, pg.created_at, pg.updated_at`;

const groupFrom = 'packaging_groups pg';

const groupJoins = `
  LEFT JOIN item_variants cv ON cv.id = pg.charcoal_variant_id
  LEFT JOIN warehouses w ON w.id = pg.default_warehouse_id`;

async function listGroups(input) {
  return listRecords({
    select: groupSelect,
    from: groupFrom,
    joins: groupJoins,
    filters: [
      { key: 'status', column: 'pg.status' },
      { key: 'store_id', column: 'pg.store_id' },
      { key: 'charcoal_variant_id', column: 'pg.charcoal_variant_id' },
      { key: 'search', type: 'search', fields: ['pg.name', 'pg.code', 'cv.variant_name'] }
    ],
    orderBy: 'ORDER BY pg.name ASC'
  }, input);
}

async function findGroupById(id) {
  const rows = await query(
    `${groupSelect}
     FROM ${groupFrom}
     ${groupJoins}
     WHERE pg.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createGroup(data) {
  return insertRecord('packaging_groups', data);
}

async function updateGroup(id, data) {
  return updateRecord('packaging_groups', id, data);
}

async function deactivateGroup(id) {
  const result = await query('UPDATE packaging_groups SET status = ? WHERE id = ?', ['inactive', id]);
  return result.affectedRows;
}

async function hardDeleteGroup(id) {
  const result = await query('DELETE FROM packaging_groups WHERE id = ?', [id]);
  return result.affectedRows;
}

async function getGroupComponents(groupId) {
  return query(
    `SELECT
       pgc.id, pgc.store_id, pgc.packaging_group_id, pgc.parent_component_id,
       parent.variant_name AS parent_variant_name,
       pgc.level_key, pgc.item_variant_id, iv.variant_name, iv.sku, iv.attributes_json AS variant_attributes_json,
       i.name AS item_name, iv.cost, pgc.unit_symbol, pgc.quantity_per_parent, pgc.capacity_kg,
       pgc.sort_order, pgc.notes, pgc.created_at, pgc.updated_at
     FROM packaging_group_components pgc
     JOIN item_variants iv ON iv.id = pgc.item_variant_id
     JOIN items i ON i.id = iv.item_id
     LEFT JOIN packaging_group_components parent_component ON parent_component.id = pgc.parent_component_id
     LEFT JOIN item_variants parent ON parent.id = parent_component.item_variant_id
     WHERE pgc.packaging_group_id = ?
     ORDER BY
       FIELD(pgc.level_key, 'category', 'item', 'sub_item', 'sub_sub_item'),
       pgc.sort_order ASC,
       pgc.id ASC`,
    [groupId]
  );
}

async function findComponentById(id) {
  const rows = await query(
    `SELECT pgc.*, pg.status AS group_status, iv.attributes_json AS variant_attributes_json
     FROM packaging_group_components pgc
     JOIN packaging_groups pg ON pg.id = pgc.packaging_group_id
     JOIN item_variants iv ON iv.id = pgc.item_variant_id
     WHERE pgc.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createComponent(data) {
  return insertRecord('packaging_group_components', data);
}

async function updateComponent(id, data) {
  return updateRecord('packaging_group_components', id, data);
}

async function deleteComponent(id) {
  const result = await query('DELETE FROM packaging_group_components WHERE id = ?', [id]);
  return result.affectedRows;
}

async function countComponentChildren(id) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM packaging_group_components WHERE parent_component_id = ?',
    [id]
  );

  return Number(rows[0].total);
}

async function listAssignments(input) {
  return listRecords({
    select: `SELECT
      pga.id, pga.store_id, pga.packaging_group_id, pg.name AS packaging_group_name,
      pga.warehouse_id, w.name AS warehouse_name, pga.charcoal_variant_id,
      cv.variant_name AS charcoal_variant_name, cv.sku AS charcoal_sku,
      pga.output_item_variant_id, ov.variant_name AS output_variant_name, ov.sku AS output_sku,
      oi.name AS output_item_name,
      pga.charcoal_quantity_kg, pga.primary_container_count, pga.produced_quantity,
      GREATEST(pga.produced_quantity - COALESCE(allocated.allocated_quantity, 0), 0) AS available_quantity,
      pga.total_packaging_cost, pga.cost_per_kg, pga.status, pga.production_batch_id,
      pga.calculation_json, pga.consumed_at, pga.consumed_by, pga.consumed_movements_json,
      pga.notes, pga.created_by, pga.created_at`,
    from: 'packaging_group_assignments pga',
    joins: `
      JOIN packaging_groups pg ON pg.id = pga.packaging_group_id
      JOIN warehouses w ON w.id = pga.warehouse_id
      JOIN item_variants cv ON cv.id = pga.charcoal_variant_id
      LEFT JOIN item_variants ov ON ov.id = pga.output_item_variant_id
      LEFT JOIN items oi ON oi.id = ov.item_id
      LEFT JOIN (
        SELECT di.packaging_assignment_id,
          SUM(di.quantity - di.returned_quantity) AS allocated_quantity
        FROM dispatch_items di
        JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
        WHERE di.packaging_assignment_id IS NOT NULL
          AND dr.status <> 'cancelled'
        GROUP BY di.packaging_assignment_id
      ) allocated ON allocated.packaging_assignment_id = pga.id`,
    filters: [
      { key: 'store_id', column: 'pga.store_id' },
      { key: 'status', column: 'pga.status' },
      { key: 'packaging_group_id', column: 'pga.packaging_group_id' },
      { key: 'warehouse_id', column: 'pga.warehouse_id' },
      { key: 'charcoal_variant_id', column: 'pga.charcoal_variant_id' },
      { key: 'output_item_variant_id', column: 'pga.output_item_variant_id' },
      { key: 'production_batch_id', column: 'pga.production_batch_id' },
      { key: 'search', type: 'search', fields: ['pg.name', 'w.name', 'cv.variant_name', 'cv.sku', 'ov.variant_name', 'ov.sku'] }
    ],
    orderBy: 'ORDER BY pga.created_at DESC, pga.id DESC'
  }, input);
}

async function createAssignment(data) {
  const payload = {
    ...data,
    calculation_json: data.calculation_json ? JSON.stringify(data.calculation_json) : null
  };

  return insertRecord('packaging_group_assignments', payload);
}

async function deleteAssignment(id) {
  const result = await query('DELETE FROM packaging_group_assignments WHERE id = ?', [id]);
  return result.affectedRows;
}

async function findAssignmentById(id) {
  const rows = await query(
    `SELECT
       pga.id, pga.store_id, pga.packaging_group_id, pga.warehouse_id,
       pga.charcoal_variant_id, pga.output_item_variant_id,
       pga.charcoal_quantity_kg, pga.primary_container_count, pga.produced_quantity,
       GREATEST(pga.produced_quantity - COALESCE(allocated.allocated_quantity, 0), 0) AS available_quantity,
       pga.total_packaging_cost, pga.cost_per_kg, pga.status, pga.production_batch_id,
       pga.calculation_json, pga.consumed_at, pga.consumed_by, pga.consumed_movements_json,
       pga.notes, pga.created_by, pga.created_at
     FROM packaging_group_assignments pga
     LEFT JOIN (
       SELECT di.packaging_assignment_id,
         SUM(di.quantity - di.returned_quantity) AS allocated_quantity
       FROM dispatch_items di
       JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
       WHERE di.packaging_assignment_id IS NOT NULL
         AND dr.status <> 'cancelled'
       GROUP BY di.packaging_assignment_id
     ) allocated ON allocated.packaging_assignment_id = pga.id
     WHERE pga.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function updateAssignment(connection, id, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (!entries.length) return findAssignmentById(id);
  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  const params = entries.map(([, value]) => {
    if (value instanceof Date) {
      return value;
    }
    if (value && (typeof value === 'object' || Array.isArray(value))) {
      return JSON.stringify(value);
    }
    return value === undefined || value === '' ? null : value;
  });

  if (connection) {
    await connection.execute(
      `UPDATE packaging_group_assignments SET ${assignments} WHERE id = ?`,
      [...params, id]
    );
  } else {
    await query(
      `UPDATE packaging_group_assignments SET ${assignments} WHERE id = ?`,
      [...params, id]
    );
  }

  return findAssignmentById(id);
}

async function getWarehouseVariantBalances(warehouseId, variantIds) {
  if (!variantIds.length) return [];
  const placeholders = variantIds.map(() => '?').join(', ');

  return query(
    `SELECT item_variant_id, quantity_on_hand, quantity_reserved, average_cost
     FROM stock_balances
     WHERE warehouse_id = ? AND item_variant_id IN (${placeholders})`,
    [warehouseId, ...variantIds]
  );
}

async function getVariantCost(itemVariantId, warehouseId = null) {
  const rows = await query(
    `SELECT COALESCE(NULLIF(sb.average_cost, 0), iv.cost, 0) AS cost
     FROM item_variants iv
     LEFT JOIN stock_balances sb
       ON sb.item_variant_id = iv.id AND sb.warehouse_id = ?
     WHERE iv.id = ?
     LIMIT 1`,
    [warehouseId, itemVariantId]
  );

  return rows[0] ? Number(rows[0].cost) : 0;
}

async function getAssignmentAllocatedQuantity(id, connection = null) {
  const sql = `SELECT COALESCE(SUM(di.quantity - di.returned_quantity), 0) AS allocated_quantity
     FROM dispatch_items di
     JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
     WHERE di.packaging_assignment_id = ?
       AND dr.status <> 'cancelled'`;
  const rows = connection
    ? (await connection.execute(sql, [id]))[0]
    : await query(sql, [id]);

  return Number(rows[0]?.allocated_quantity || 0);
}

module.exports = {
  countComponentChildren,
  createAssignment,
  createComponent,
  createGroup,
  deleteAssignment,
  deactivateGroup,
  deleteComponent,
  findComponentById,
  findAssignmentById,
  findGroupById,
  getGroupComponents,
  getAssignmentAllocatedQuantity,
  getVariantCost,
  getWarehouseVariantBalances,
  hardDeleteGroup,
  listAssignments,
  listGroups,
  updateComponent,
  updateAssignment,
  updateGroup
};
