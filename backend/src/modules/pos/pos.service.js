const ApiError = require('../../utils/ApiError');
const { decimal } = require('../../utils/money');
const { resolveStoreId } = require('../../utils/storeScope');
const { query } = require('../../bootstrap/db');
const customerService = require('../customers/customers.service');
const model = require('./pos.model');

function validationError(field, message) {
  return ApiError.badRequest('Validation failed', [{ field, message }]);
}

function hasPermission(actor = {}, permission) {
  if (actor.is_superadmin) return true;
  const permissions = new Set(actor.permissions || []);
  return permissions.has('*') || permissions.has(permission);
}

async function runQuery(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

function assertStoreRow(row, storeId, field, message) {
  if (!row || Number(row.store_id) !== Number(storeId)) {
    throw validationError(field, message);
  }
  return row;
}

async function getLinkedSalesman(actor = {}, input = {}, connection = null) {
  const storeId = resolveStoreId(actor, input);
  const canManageOthers = hasPermission(actor, 'pos.create_for_salesman') || hasPermission(actor, 'dispatch.create');
  if (input.salesman_id && canManageOthers) {
    const salesman = await model.findSalesmanById(input.salesman_id, connection);
    assertStoreRow(salesman, storeId, 'salesman_id', 'Salesman not found');
    if (salesman.status !== 'active') throw validationError('salesman_id', 'Salesman must be active');
    return { storeId, salesman };
  }

  const salesman = await model.findSalesmanByUserId(actor.id, storeId, connection);
  if (!salesman || salesman.status !== 'active') {
    if (canManageOthers || hasPermission(actor, 'salesmen.manage') || hasPermission(actor, 'salesman_workspace.view')) {
      return { storeId, salesman: null };
    }
    throw ApiError.forbidden('Mini POS requires an active salesman account linked to the signed-in user');
  }
  if (input.salesman_id && Number(input.salesman_id) !== Number(salesman.id) && !canManageOthers) {
    throw ApiError.forbidden('You do not have permission to create or edit requests for another salesman');
  }
  return { storeId, salesman };
}

async function assertWarehouse(warehouseId, storeId, connection = null) {
  const warehouse = await model.findWarehouseById(warehouseId, connection);
  assertStoreRow(warehouse, storeId, 'warehouse_id', 'Warehouse does not belong to this store');
  if (warehouse.status !== 'active') throw validationError('warehouse_id', 'Warehouse must be active');
  return warehouse;
}

async function assertTerritory(salesmanId, locationId, sublocationId, connection = null) {
  const territories = await model.listSalesmanTerritories(salesmanId, connection);
  if (!territories.some((row) => Number(row.location_id) === Number(locationId)
    && Number(row.sublocation_id) === Number(sublocationId))) {
    throw validationError('sublocation_id', 'The selected territory is not assigned to the signed-in salesman');
  }
}

async function normalAvailableBaseQuantity(itemId, warehouseId, connection = null) {
  const rows = await runQuery(connection,
    `SELECT COALESCE(quantity_on_hand - quantity_reserved, 0) AS quantity
     FROM item_stock_balances WHERE warehouse_id = ? AND item_id = ? LIMIT 1`,
    [warehouseId, itemId]);
  return decimal(rows[0]?.quantity || 0);
}

async function availableSealedCartons(itemId, warehouseId, connection = null) {
  const rows = await runQuery(connection,
    `SELECT COALESCE(SUM(GREATEST(
       FLOOR(l.remaining_cartons - COALESCE(reserved.reserved_inventory_quantity, 0) / l.kg_per_carton), 0
     )), 0) AS quantity
     FROM carton_stock_lots l
     LEFT JOIN (
       SELECT carton_stock_lot_id, SUM(inventory_quantity) AS reserved_inventory_quantity
       FROM dispatch_line_allocations WHERE allocation_type = 'carton_lot' AND status = 'reserved'
       GROUP BY carton_stock_lot_id
     ) reserved ON reserved.carton_stock_lot_id = l.id
     WHERE l.warehouse_id = ? AND l.item_id = ?`, [warehouseId, itemId]);
  return decimal(rows[0]?.quantity || 0);
}

async function readyContainerPool(packagingGroupId, warehouseId, connection = null) {
  return runQuery(connection,
    `SELECT c.id, c.status, c.initial_inner_quantity, c.remaining_inner_quantity,
       COALESCE(reserved.reserved_outer, 0) AS reserved_outer,
       COALESCE(reserved.reserved_inner, 0) AS reserved_inner
     FROM ready_stock_containers c
     LEFT JOIN (
       SELECT dla.ready_stock_container_id,
         SUM(CASE WHEN di.fulfillment_type = 'ready_outer_carton' THEN dla.allocated_quantity ELSE 0 END) AS reserved_outer,
         SUM(CASE WHEN di.fulfillment_type = 'ready_inner_unit' THEN dla.allocated_quantity ELSE 0 END) AS reserved_inner
       FROM dispatch_line_allocations dla JOIN dispatch_items di ON di.id = dla.dispatch_item_id
       WHERE dla.status = 'reserved' AND dla.ready_stock_container_id IS NOT NULL
       GROUP BY dla.ready_stock_container_id
     ) reserved ON reserved.ready_stock_container_id = c.id
     WHERE c.warehouse_id = ? AND c.packaging_group_id = ? AND c.status IN ('full', 'partial')
     ORDER BY c.created_at ASC, c.id ASC`, [warehouseId, packagingGroupId]);
}

async function offerAvailability(entry, warehouseId, connection = null) {
  if (entry.entry_type === 'normal_carton') return availableSealedCartons(entry.item_id, warehouseId, connection);
  if (entry.entry_type === 'normal_weight' || entry.entry_type === 'normal_piece') {
    return normalAvailableBaseQuantity(entry.item_id, warehouseId, connection);
  }
  const containers = await readyContainerPool(entry.packaging_group_id, warehouseId, connection);
  if (entry.entry_type === 'ready_outer_carton') {
    return decimal(containers.filter((container) => container.status === 'full'
      && decimal(container.remaining_inner_quantity).eq(container.initial_inner_quantity)
      && decimal(container.reserved_outer).eq(0) && decimal(container.reserved_inner).eq(0)).length);
  }
  return containers.reduce((total, container) => {
    if (decimal(container.reserved_outer).gt(0)) return total;
    const available = decimal(container.remaining_inner_quantity).minus(container.reserved_inner);
    return total.plus(available.gt(0) ? available : 0);
  }, decimal(0));
}

async function getOwnWorkspace(input = {}, actor = {}) {
  const { storeId, salesman: linkedSalesman } = await getLinkedSalesman(actor, input);
  let salesman = linkedSalesman;
  const canChooseSalesman = hasPermission(actor, 'pos.create_for_salesman')
    || hasPermission(actor, 'dispatch.create') || hasPermission(actor, 'salesmen.manage');
  if (!salesman && input.salesman_id && canChooseSalesman) {
    salesman = await model.findSalesmanById(input.salesman_id);
    assertStoreRow(salesman, storeId, 'salesman_id', 'Salesman not found');
    if (salesman.status !== 'active') throw validationError('salesman_id', 'Salesman must be active');
  }
  if (!salesman) {
    if (!canChooseSalesman) throw ApiError.forbidden('Mini POS workspace requires a linked salesman account');
    return { salesman: null, selection_required: true, available_salesmen: await model.listActiveSalesmen(storeId), metrics: {}, territories: [], recent_dispatches: [], recent_debts: [], recent_commissions: [], target_progress: [] };
  }
  const scoped = { ...input, store_id: storeId, salesman_id: salesman.id, limit: input.limit || 20 };
  const [metrics, recent_dispatches, recent_debts, recent_commissions, target_progress, territories] = await Promise.all([
    model.getSalesmanWorkspaceSummary(scoped), model.listSalesmanWorkspaceDispatches(scoped),
    model.listSalesmanWorkspaceDebts(scoped), model.listSalesmanWorkspaceCommissions(scoped),
    model.listSalesmanWorkspaceTargets(scoped), model.listSalesmanTerritories(salesman.id)
  ]);
  return { salesman: { id: Number(salesman.id), full_name: salesman.full_name, code: salesman.code || null }, selection_required: false, available_salesmen: [], metrics, territories, recent_dispatches, recent_debts, recent_commissions, target_progress };
}

async function listOwnTerritories(input = {}, actor = {}) {
  const { salesman } = await getLinkedSalesman(actor, input);
  return salesman ? model.listSalesmanTerritories(salesman.id) : [];
}

async function listOwnCustomers(input = {}, actor = {}) {
  const { storeId, salesman } = await getLinkedSalesman(actor, input);
  return customerService.listCustomers({ ...input, store_id: storeId, salesman_id: salesman ? salesman.id : (input.salesman_id || undefined), status: 'active' }, actor);
}

async function createOwnCustomer(data, userId, actor = {}) {
  const { salesman_id, ...customerData } = data;
  const { storeId, salesman } = await getLinkedSalesman(actor, { ...customerData, salesman_id });
  if (!salesman) throw validationError('salesman_id', 'Creating a customer requires an assigned salesman');
  await assertTerritory(salesman.id, data.location_id, data.sublocation_id);
  return customerService.createCustomer({ ...customerData, store_id: storeId, assigned_salesman_id: salesman.id, status: 'active' }, userId, actor);
}

async function listCatalog(input = {}, actor = {}) {
  const { storeId } = await getLinkedSalesman(actor, input);
  await assertWarehouse(input.warehouse_id, storeId);
  const result = await model.listPosCatalogEntries({ ...input, store_id: storeId });
  const rows = [];
  for (const entry of result.rows) {
    const completeEntry = await model.findSaleCatalogEntryById(entry.id);
    if ((completeEntry.item_id && completeEntry.item_status !== 'active')
      || (completeEntry.packaging_group_id && completeEntry.packaging_group_status !== 'active')) continue;
    if ((await offerAvailability(completeEntry, input.warehouse_id)).gt(0)) rows.push({ ...entry, available: true });
  }
  return { ...result, rows, meta: { ...result.meta, availableTotal: rows.length } };
}

async function listOwnWarehouses(input = {}, actor = {}) {
  const { storeId } = await getLinkedSalesman(actor, input);
  return model.listActiveWarehouses(storeId);
}

module.exports = {
  createOwnCustomer,
  getLinkedSalesman,
  getOwnWorkspace,
  listCatalog,
  listOwnWarehouses,
  listOwnCustomers,
  listOwnTerritories,
  _private: { offerAvailability }
};
