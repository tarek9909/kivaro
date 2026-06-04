const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, nullable, updateRecord } = require('../../utils/crud');

async function listPackagingConfigurations(input) {
  return listRecords({
    select: `SELECT
      pc.id, pc.store_id, pc.config_name, pc.output_item_variant_id, outv.variant_name AS output_variant_name,
      pc.charcoal_variant_id, cv.variant_name AS charcoal_variant_name, pc.packaging_type,
      pc.charcoal_quantity_per_output, pc.charcoal_unit_id, pc.packages_per_carton,
      pc.is_active, pc.notes, pc.created_by, pc.created_at, pc.updated_at`,
    from: 'packaging_configurations pc',
    joins: `
      JOIN item_variants outv ON outv.id = pc.output_item_variant_id
      LEFT JOIN item_variants cv ON cv.id = pc.charcoal_variant_id`,
    filters: [
      { key: 'is_active', column: 'pc.is_active' },
      { key: 'store_id', column: 'pc.store_id' },
      { key: 'output_item_variant_id', column: 'pc.output_item_variant_id' },
      { key: 'search', type: 'search', fields: ['pc.config_name', 'outv.variant_name'] }
    ],
    orderBy: 'ORDER BY pc.config_name ASC'
  }, input);
}

async function findPackagingConfigurationById(id) {
  return findById('packaging_configurations', id);
}

async function getPackagingComponents(configId) {
  return query(
    `SELECT pcc.id, pcc.packaging_configuration_id, pcc.component_item_variant_id,
      iv.variant_name, iv.sku, i.name AS item_name, pcc.quantity_per_output,
      i.base_unit_id, pcc.unit_id, u.symbol AS unit_symbol, pcc.component_role, pcc.waste_percentage,
      pcc.created_at
     FROM packaging_configuration_components pcc
     JOIN item_variants iv ON iv.id = pcc.component_item_variant_id
     JOIN items i ON i.id = iv.item_id
     JOIN units u ON u.id = pcc.unit_id
     WHERE pcc.packaging_configuration_id = ?
     ORDER BY pcc.id ASC`,
    [configId]
  );
}

async function findPackagingComponentById(id) {
  const rows = await query(
    `SELECT pcc.*, pc.store_id
     FROM packaging_configuration_components pcc
     JOIN packaging_configurations pc ON pc.id = pcc.packaging_configuration_id
     WHERE pcc.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createPackagingConfiguration(data) {
  return insertRecord('packaging_configurations', data);
}

async function updatePackagingConfiguration(id, data) {
  return updateRecord('packaging_configurations', id, data);
}

async function deletePackagingConfiguration(id) {
  const result = await query('UPDATE packaging_configurations SET is_active = 0 WHERE id = ?', [id]);
  return result.affectedRows;
}

async function addPackagingComponent(data) {
  return insertRecord('packaging_configuration_components', data);
}

async function updatePackagingComponent(id, data) {
  return updateRecord('packaging_configuration_components', id, data);
}

async function deletePackagingComponent(id) {
  const result = await query('DELETE FROM packaging_configuration_components WHERE id = ?', [id]);
  return result.affectedRows;
}

async function listProductionBatches(input) {
  return listRecords({
    select: `SELECT
      pb.id, pb.store_id, pb.batch_number, pb.packaging_configuration_id, pc.config_name,
      pb.packaging_group_id, pg.name AS packaging_group_name,
      pb.warehouse_id, w.name AS warehouse_name, pb.charcoal_variant_id,
      cv.variant_name AS charcoal_variant_name, pb.output_item_variant_id,
      iv.variant_name AS output_variant_name, pb.planned_quantity, pb.produced_quantity,
      pb.total_component_cost, pb.cost_per_output, pb.status, pb.started_at,
      pb.completed_at, pb.notes, pb.created_by, pb.created_at, pb.updated_at`,
    from: 'production_batches pb',
    joins: `
      LEFT JOIN packaging_configurations pc ON pc.id = pb.packaging_configuration_id
      LEFT JOIN packaging_groups pg ON pg.id = pb.packaging_group_id
      JOIN warehouses w ON w.id = pb.warehouse_id
      LEFT JOIN item_variants cv ON cv.id = pb.charcoal_variant_id
      JOIN item_variants iv ON iv.id = pb.output_item_variant_id`,
    filters: [
      { key: 'status', column: 'pb.status' },
      { key: 'store_id', column: 'pb.store_id' },
      { key: 'warehouse_id', column: 'pb.warehouse_id' },
      { key: 'packaging_configuration_id', column: 'pb.packaging_configuration_id' },
      { key: 'packaging_group_id', column: 'pb.packaging_group_id' },
      { key: 'search', type: 'search', fields: ['pb.batch_number', 'pc.config_name', 'pg.name'] }
    ],
    orderBy: 'ORDER BY pb.created_at DESC, pb.id DESC'
  }, input);
}

async function findProductionBatchById(id) {
  const rows = await query(
    `SELECT
       pb.id, pb.store_id, pb.batch_number, pb.packaging_configuration_id, pc.config_name,
       pb.packaging_group_id, pg.name AS packaging_group_name,
       pb.warehouse_id, w.name AS warehouse_name, pb.charcoal_variant_id,
       cv.variant_name AS charcoal_variant_name, pb.output_item_variant_id,
       iv.variant_name AS output_variant_name, pb.planned_quantity, pb.produced_quantity,
       pb.total_component_cost, pb.cost_per_output, pb.status, pb.started_at,
       pb.completed_at, pb.notes, pb.created_by, pb.created_at, pb.updated_at
     FROM production_batches pb
     LEFT JOIN packaging_configurations pc ON pc.id = pb.packaging_configuration_id
     LEFT JOIN packaging_groups pg ON pg.id = pb.packaging_group_id
     JOIN warehouses w ON w.id = pb.warehouse_id
     LEFT JOIN item_variants cv ON cv.id = pb.charcoal_variant_id
     JOIN item_variants iv ON iv.id = pb.output_item_variant_id
     WHERE pb.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function lockProductionBatch(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM production_batches
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function getProductionBatchComponents(batchId) {
  return query(
    `SELECT pbc.id, pbc.production_batch_id, pbc.component_item_variant_id,
      iv.variant_name, iv.sku, i.name AS item_name, pbc.planned_quantity,
      pbc.consumed_quantity, pbc.unit_cost, pbc.total_cost, pbc.created_at
     FROM production_batch_components pbc
     JOIN item_variants iv ON iv.id = pbc.component_item_variant_id
     JOIN items i ON i.id = iv.item_id
     WHERE pbc.production_batch_id = ?
     ORDER BY pbc.id ASC`,
    [batchId]
  );
}

async function createProductionBatch(data) {
  return insertRecord('production_batches', data);
}

async function updateProductionBatch(id, data) {
  return updateRecord('production_batches', id, data);
}

async function setProductionBatchStatus(connection, id, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
  const params = entries.map(([, value]) => nullable(value));

  await connection.execute(
    `UPDATE production_batches
     SET ${assignments}
     WHERE id = ?`,
    [...params, id]
  );
}

async function createProductionBatchComponent(connection, data) {
  await connection.execute(
    `INSERT INTO production_batch_components (
      production_batch_id, component_item_variant_id, planned_quantity,
      consumed_quantity, unit_cost, total_cost
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.production_batch_id,
      data.component_item_variant_id,
      data.planned_quantity,
      data.consumed_quantity,
      data.unit_cost,
      data.total_cost
    ]
  );
}

async function getVariantCost(itemVariantId, warehouseId) {
  const rows = await query(
    `SELECT COALESCE(sb.average_cost, iv.cost, 0) AS cost
     FROM item_variants iv
     LEFT JOIN stock_balances sb
       ON sb.item_variant_id = iv.id AND sb.warehouse_id = ?
     WHERE iv.id = ?
     LIMIT 1`,
    [warehouseId, itemVariantId]
  );

  return rows[0] ? Number(rows[0].cost) : 0;
}

async function closePreviousCostHistory(connection, itemVariantId) {
  await connection.execute(
    `UPDATE product_cost_history
     SET effective_to = NOW()
     WHERE item_variant_id = ? AND effective_to IS NULL`,
    [itemVariantId]
  );
}

async function createCostHistory(connection, data) {
  await connection.execute(
    `INSERT INTO product_cost_history (
      store_id, item_variant_id, packaging_configuration_id, calculated_cost,
      selling_price, profit_amount, profit_margin_percentage, effective_from, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      nullable(data.store_id),
      data.item_variant_id,
      nullable(data.packaging_configuration_id),
      data.calculated_cost,
      nullable(data.selling_price),
      nullable(data.profit_amount),
      nullable(data.profit_margin_percentage),
      nullable(data.created_by)
    ]
  );
}

async function listProductCostHistory(input) {
  return listRecords({
    select: `SELECT pch.id, pch.store_id, pch.item_variant_id, iv.variant_name, pch.packaging_configuration_id,
      pch.calculated_cost, pch.selling_price, pch.profit_amount, pch.profit_margin_percentage,
      pch.effective_from, pch.effective_to, pch.created_by, pch.created_at`,
    from: 'product_cost_history pch',
    joins: 'JOIN item_variants iv ON iv.id = pch.item_variant_id',
    filters: [
      { key: 'item_variant_id', column: 'pch.item_variant_id' },
      { key: 'store_id', column: 'pch.store_id' },
      { key: 'packaging_configuration_id', column: 'pch.packaging_configuration_id' }
    ],
    orderBy: 'ORDER BY pch.effective_from DESC, pch.id DESC'
  }, input);
}

module.exports = {
  addPackagingComponent,
  closePreviousCostHistory,
  createCostHistory,
  createPackagingConfiguration,
  createProductionBatch,
  createProductionBatchComponent,
  deletePackagingComponent,
  deletePackagingConfiguration,
  findPackagingConfigurationById,
  findPackagingComponentById,
  findProductionBatchById,
  getPackagingComponents,
  getProductionBatchComponents,
  getVariantCost,
  listPackagingConfigurations,
  listProductCostHistory,
  listProductionBatches,
  lockProductionBatch,
  setProductionBatchStatus,
  updatePackagingComponent,
  updatePackagingConfiguration,
  updateProductionBatch
};
