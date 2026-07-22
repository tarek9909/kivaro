const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const { writeAuditLog } = require('../../middleware/audit.middleware');
const inventoryModel = require('./inventory.model');
const locationModel = require('../locations/locations.model');
const stockService = require('./stock.service');

function pagedResult(resourceName, rows, total, pagination) {
  return {
    [resourceName]: rows,
    meta: getPaginationMeta({ ...pagination, total })
  };
}

function validationError(field, message) {
  return ApiError.badRequest('Validation failed', [{ field, message }]);
}

function isConstraintError(error) {
  return ['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED', 'ER_NO_REFERENCED_ROW_2'].includes(error?.code);
}

async function runHardDelete(action, message) {
  try {
    await action();
  } catch (error) {
    if (isConstraintError(error)) throw ApiError.conflict(message);
    throw error;
  }
}

async function assertNoCategoryCycle(id, parentId, actor = {}) {
  let nextParentId = parentId;
  const visited = new Set();
  while (nextParentId) {
    if (Number(nextParentId) === Number(id) || visited.has(Number(nextParentId))) {
      throw validationError('parent_id', 'Category hierarchy cannot contain cycles');
    }
    visited.add(Number(nextParentId));
    const parent = await getCategory(nextParentId, actor);
    nextParentId = parent.parent_id;
  }
}

async function assertNoUnitCycle(id, baseUnitId, actor = {}) {
  let nextBaseUnitId = baseUnitId;
  const visited = new Set();
  while (nextBaseUnitId) {
    if (Number(nextBaseUnitId) === Number(id) || visited.has(Number(nextBaseUnitId))) {
      throw validationError('base_unit_id', 'Unit hierarchy cannot contain cycles');
    }
    visited.add(Number(nextBaseUnitId));
    const baseUnit = await getUnit(nextBaseUnitId, actor);
    nextBaseUnitId = baseUnit.base_unit_id;
  }
}

function assertUnitCompatible(baseUnit, storeId, unitType) {
  assertSameStore(baseUnit, storeId, 'base_unit_id', 'Base unit does not belong to this store');
  if (baseUnit.unit_type !== unitType) {
    throw validationError('base_unit_id', 'Base unit must use the same unit type');
  }
}

function assertUnitMatchesStockMode(unit, configuration) {
  const expectedUnitType = configuration.stock_mode === 'piece' ? 'quantity' : 'weight';
  if (unit.unit_type !== expectedUnitType) {
    throw validationError(
      'base_unit_id',
      configuration.stock_mode === 'piece'
        ? 'Piece stock mode requires a quantity unit'
        : 'Weight and carton-weight stock modes require a weight unit'
    );
  }
  if (configuration.item_kind === 'packaging' && unit.symbol !== 'pc') {
    throw validationError('base_unit_id', 'Packaging items must use pc as their stock unit');
  }
}

function itemConfiguration(current, updates = {}) {
  const next = {
    item_kind: updates.item_kind === undefined ? current?.item_kind : updates.item_kind,
    stock_mode: updates.stock_mode === undefined ? current?.stock_mode : updates.stock_mode,
    kg_per_carton: updates.kg_per_carton === undefined ? current?.kg_per_carton : updates.kg_per_carton,
    loose_units_per_carton: updates.loose_units_per_carton === undefined
      ? current?.loose_units_per_carton
      : updates.loose_units_per_carton,
    max_content_weight_kg: updates.max_content_weight_kg === undefined
      ? current?.max_content_weight_kg
      : updates.max_content_weight_kg,
    carton_selling_price: updates.carton_selling_price === undefined
      ? current?.carton_selling_price
      : updates.carton_selling_price,
    loose_unit_selling_price: updates.loose_unit_selling_price === undefined
      ? current?.loose_unit_selling_price
      : updates.loose_unit_selling_price
  };

  if (!['normal', 'packaging'].includes(next.item_kind)) {
    throw validationError('item_kind', 'Item kind must be normal or packaging');
  }
  if (!['carton_weight', 'weight', 'piece'].includes(next.stock_mode)) {
    throw validationError('stock_mode', 'Stock mode must be carton_weight, weight, or piece');
  }
  if (next.item_kind === 'packaging' && next.stock_mode !== 'piece') {
    throw validationError('stock_mode', 'Packaging items must use piece stock mode');
  }
  if (next.item_kind === 'normal' && next.stock_mode === 'carton_weight') {
    if (decimal(next.kg_per_carton).lte(0)) {
      throw validationError('kg_per_carton', 'Carton-weight items require kg per carton');
    }
    if (decimal(next.loose_units_per_carton).lte(0) || !decimal(next.loose_units_per_carton).isInteger()) {
      throw validationError('loose_units_per_carton', 'Carton-weight items require a whole-number loose unit count per carton');
    }
  }
  if (next.item_kind === 'packaging' && decimal(next.max_content_weight_kg).lt(0)) {
    throw validationError('max_content_weight_kg', 'Packaging capacity cannot be negative');
  }

  // Capacity belongs to packaging; carton configuration belongs only to normal carton-weight items.
  if (next.item_kind !== 'packaging') next.max_content_weight_kg = null;
  if (next.stock_mode !== 'carton_weight') {
    next.kg_per_carton = null;
    next.loose_units_per_carton = null;
    next.carton_selling_price = null;
    next.loose_unit_selling_price = null;
  }
  if (next.item_kind === 'packaging') {
    next.kg_per_carton = null;
    next.loose_units_per_carton = null;
    if (next.max_content_weight_kg === undefined || next.max_content_weight_kg === null) {
      next.max_content_weight_kg = 0;
    }
    next.carton_selling_price = null;
    next.loose_unit_selling_price = null;
  }
  return next;
}

function hasStockConfigurationChange(current, next, updates) {
  const configFields = [
    'item_kind',
    'stock_mode',
    'kg_per_carton',
    'loose_units_per_carton',
    'max_content_weight_kg',
    'base_unit_id'
  ];
  return configFields.some((field) => {
    if (updates[field] === undefined) return false;
    return String(current[field] ?? '') !== String(next[field] ?? updates[field] ?? '');
  });
}

function initialStockInput(data, configuration) {
  const quantity = data.initial_quantity === undefined ? decimal(0) : decimal(data.initial_quantity);
  const cartons = data.initial_cartons === undefined ? decimal(0) : decimal(data.initial_cartons);
  if (quantity.lt(0) || cartons.lt(0)) {
    throw validationError('initial_quantity', 'Initial stock cannot be negative');
  }
  if (quantity.gt(0) && cartons.gt(0)) {
    throw validationError('initial_quantity', 'Send initial quantity or initial cartons, not both');
  }
  if (configuration.stock_mode === 'carton_weight') {
    if (quantity.gt(0)) {
      throw validationError('initial_quantity', 'Carton-weight items must receive initial stock by carton count');
    }
    if (!cartons.isInteger()) {
      throw validationError('initial_cartons', 'Initial carton count must be a whole number');
    }
    return { cartonCount: cartons, quantity: decimal(0) };
  }
  if (cartons.gt(0)) {
    throw validationError('initial_cartons', 'Only carton-weight items accept carton counts');
  }
  if (configuration.stock_mode === 'piece' && !quantity.isInteger()) {
    throw validationError('initial_quantity', 'Piece-based initial stock must be a whole number');
  }
  return { cartonCount: decimal(0), quantity };
}

function toCanonicalQuantity(item, value, field = 'quantity') {
  const quantity = decimal(value);
  if (item.stock_mode !== 'weight') return quantity;
  const conversion = decimal(item.base_unit_conversion_to_base || item.conversion_to_base || 1);
  if (conversion.lte(0)) throw validationError(field, 'Weight unit conversion must be greater than zero');
  return quantity.mul(conversion);
}

async function validateInitialStockWarehouse(warehouseId, storeId, field = 'warehouse_id') {
  if (!warehouseId) throw validationError(field, 'Warehouse is required when initial stock is greater than zero');
  const warehouse = await getWarehouse(warehouseId, { store_id: storeId });
  if (warehouse.status !== 'active') throw validationError(field, 'Warehouse must be active');
  return warehouse;
}

async function listCategories(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listCategories({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('categories', result.rows, result.total, pagination);
}

async function getCategory(id, actor = {}) {
  return assertRowInScope(await inventoryModel.findCategoryById(id), actor, 'Category not found');
}

async function createCategory(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  if (scoped.parent_id) {
    const parent = await getCategory(scoped.parent_id, actor);
    assertSameStore(parent, scoped.store_id, 'parent_id', 'Parent category does not belong to this store');
  }
  return inventoryModel.createCategory(scoped);
}

async function updateCategory(id, data, actor = {}) {
  const current = await getCategory(id, actor);
  const { store_id, ...updates } = data;
  if (updates.parent_id) {
    await assertNoCategoryCycle(id, updates.parent_id, actor);
    const parent = await getCategory(updates.parent_id, actor);
    assertSameStore(parent, current.store_id, 'parent_id', 'Parent category does not belong to this store');
  }
  return inventoryModel.updateCategory(id, updates);
}

async function deleteCategory(id, actor = {}) {
  await getCategory(id, actor);
  await inventoryModel.deactivateCategory(id);
}

async function hardDeleteCategory(id, actor = {}) {
  await getCategory(id, actor);
  await runHardDelete(
    () => inventoryModel.hardDeleteCategory(id),
    'Category cannot be hard-deleted while items or child categories reference it'
  );
}

async function listUnits(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listUnits({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('units', result.rows, result.total, pagination);
}

async function getUnit(id, actor = {}) {
  return assertRowInScope(await inventoryModel.findUnitById(id), actor, 'Unit not found');
}

async function createUnit(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  if (scoped.base_unit_id) {
    const baseUnit = await getUnit(scoped.base_unit_id, actor);
    assertUnitCompatible(baseUnit, scoped.store_id, scoped.unit_type);
  }
  return inventoryModel.createUnit(scoped);
}

async function updateUnit(id, data, actor = {}) {
  const current = await getUnit(id, actor);
  const { store_id, ...updates } = data;
  const nextUnitType = updates.unit_type || current.unit_type;
  if (updates.base_unit_id) {
    await assertNoUnitCycle(id, updates.base_unit_id, actor);
    const baseUnit = await getUnit(updates.base_unit_id, actor);
    assertUnitCompatible(baseUnit, current.store_id, nextUnitType);
  } else if (updates.unit_type && current.base_unit_id) {
    const baseUnit = await getUnit(current.base_unit_id, actor);
    assertUnitCompatible(baseUnit, current.store_id, updates.unit_type);
  }
  return inventoryModel.updateUnit(id, updates);
}

async function deleteUnit(id, actor = {}) {
  await getUnit(id, actor);
  await inventoryModel.deleteUnit(id);
}

async function listItems(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listItems({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('items', result.rows, result.total, pagination);
}

async function getItem(id, actor = {}) {
  return assertRowInScope(await inventoryModel.findItemById(id), actor, 'Item not found');
}

async function createItem(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const {
    warehouse_id: warehouseId,
    initial_quantity: initialQuantity,
    initial_unit_cost: initialUnitCost,
    initial_cartons: initialCartons,
    initial_cost_per_carton: initialCostPerCarton,
    ...rawItemData
  } = scoped;
  const configuration = itemConfiguration(null, rawItemData);
  const category = await getCategory(scoped.category_id, actor);
  const unit = await getUnit(scoped.base_unit_id, actor);
  assertSameStore(category, scoped.store_id, 'category_id', 'Category does not belong to this store');
  assertSameStore(unit, scoped.store_id, 'base_unit_id', 'Unit does not belong to this store');
  assertUnitMatchesStockMode(unit, configuration);
  const initial = initialStockInput({ initial_quantity: initialQuantity, initial_cartons: initialCartons }, configuration);
  const canonicalInitialQuantity = toCanonicalQuantity({
    ...configuration,
    base_unit_conversion_to_base: unit.conversion_to_base
  }, initial.quantity, 'initial_quantity');
  if (initial.quantity.gt(0) || initial.cartonCount.gt(0)) {
    await validateInitialStockWarehouse(warehouseId, scoped.store_id);
  }

  return withTransaction(async (connection) => {
    const item = await inventoryModel.createItem({
      ...rawItemData,
      ...configuration,
      store_id: scoped.store_id,
      created_by: userId
    }, connection);
    if (initial.cartonCount.gt(0)) {
      await stockService.receiveCartonStock(connection, {
        storeId: item.store_id,
        warehouseId,
        itemId: item.id,
        item,
        cartonCount: initial.cartonCount,
        costPerCarton: initialCostPerCarton,
        movementType: 'opening_balance',
        referenceType: 'item_opening_balance',
        referenceId: item.id,
        notes: 'Opening carton balance',
        createdBy: userId
      });
    } else if (canonicalInitialQuantity.gt(0)) {
      await stockService.increaseItemStock(connection, {
        storeId: item.store_id,
        warehouseId,
        itemId: item.id,
        item,
        quantity: canonicalInitialQuantity,
        unitCost: initialUnitCost,
        movementType: 'opening_balance',
        referenceType: 'item_opening_balance',
        referenceId: item.id,
        notes: 'Opening item balance',
        createdBy: userId
      });
    }
    return item;
  });
}

async function updateItem(id, data, actor = {}) {
  const current = await getItem(id, actor);
  const { store_id, ...updates } = data;
  if (updates.category_id) {
    const category = await getCategory(updates.category_id, actor);
    assertSameStore(category, current.store_id, 'category_id', 'Category does not belong to this store');
  }
  const configuration = itemConfiguration(current, updates);
  const nextBaseUnitId = updates.base_unit_id || current.base_unit_id;
  const unit = await getUnit(nextBaseUnitId, actor);
  assertSameStore(unit, current.store_id, 'base_unit_id', 'Base unit does not belong to this store');
  assertUnitMatchesStockMode(unit, configuration);

  const protectedConfiguration = {
    ...configuration,
    base_unit_id: nextBaseUnitId
  };
  if (hasStockConfigurationChange(current, protectedConfiguration, updates)) {
    const hasMovementHistory = await inventoryModel.countItemMovements(id);
    if (hasMovementHistory > 0) {
      throw ApiError.conflict('Stock configuration cannot change after item stock activity exists');
    }
  }
  return inventoryModel.updateItem(id, {
    ...updates,
    ...configuration
  });
}

async function deleteItem(id, actor = {}) {
  await getItem(id, actor);
  const movementCount = await inventoryModel.countItemMovements(id);
  if (movementCount > 0) throw ApiError.conflict('Item cannot be deleted because it has stock movement history');
  await inventoryModel.deactivateItem(id);
}

async function hardDeleteItem(id, actor = {}) {
  await getItem(id, actor);
  if (await inventoryModel.countItemMovements(id)) {
    throw ApiError.conflict('Item cannot be hard-deleted because it has stock movement history');
  }
  if (await inventoryModel.hasItemStock(id)) {
    throw ApiError.conflict('Item cannot be hard-deleted while stock remains on hand or reserved');
  }
  await runHardDelete(
    () => withTransaction((connection) => inventoryModel.hardDeleteItemCascade(id, connection)),
    'Item cannot be hard-deleted because related records could not be removed'
  );
}

async function listWarehouses(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listWarehouses({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('warehouses', result.rows, result.total, pagination);
}

async function getWarehouse(id, actor = {}) {
  return assertRowInScope(await inventoryModel.findWarehouseById(id), actor, 'Warehouse not found');
}

async function createWarehouse(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  if (scoped.location_id) {
    const location = await locationModel.findLocationById(scoped.location_id);
    assertSameStore(location, scoped.store_id, 'location_id', 'Location does not belong to this store');
  }
  return inventoryModel.createWarehouse(scoped);
}

async function updateWarehouse(id, data, actor = {}) {
  const warehouse = await getWarehouse(id, actor);
  if (data.location_id) {
    const location = await locationModel.findLocationById(data.location_id);
    assertSameStore(location, warehouse.store_id, 'location_id', 'Location does not belong to this store');
  }
  const { store_id, ...updates } = data;
  return inventoryModel.updateWarehouse(id, updates);
}

async function deleteWarehouse(id, actor = {}) {
  await getWarehouse(id, actor);
  await inventoryModel.deactivateWarehouse(id);
}

async function listStockBalances(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listStockBalances({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('stock_balances', result.rows, result.total, pagination);
}

async function listStockMovements(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listStockMovements({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('stock_movements', result.rows, result.total, pagination);
}

async function listStockAdjustments(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listStockAdjustments({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('stock_adjustments', result.rows, result.total, pagination);
}

async function listCartonLots(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listCartonLots({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('carton_lots', result.rows, result.total, pagination);
}

async function listOpenCartonShelves(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listOpenCartonShelves({ filters: scopedQuery(query, actor), pagination });
  return pagedResult('open_carton_shelves', result.rows, result.total, pagination);
}

async function receiveStock(data, userId, audit, actor = {}) {
  const scoped = scopedData(data, actor);
  const warehouse = await getWarehouse(scoped.warehouse_id, actor);
  const item = await getItem(scoped.item_id, actor);
  assertSameStore(item, warehouse.store_id, 'item_id', 'Item does not belong to this store');
  if (warehouse.status !== 'active') throw validationError('warehouse_id', 'Warehouse must be active');

  const result = await withTransaction(async (connection) => {
    if (item.stock_mode === 'carton_weight') {
      if (!scoped.carton_count || scoped.quantity) {
        throw validationError('carton_count', 'Carton-weight receipts require carton count only');
      }
      return stockService.receiveCartonStock(connection, {
        storeId: warehouse.store_id,
        warehouseId: warehouse.id,
        itemId: item.id,
        item,
        cartonCount: scoped.carton_count,
        costPerCarton: scoped.cost_per_carton,
        movementType: 'purchase_receive',
        referenceType: 'stock_receipt',
        notes: scoped.notes,
        createdBy: userId
      });
    }
    if (!scoped.quantity || scoped.carton_count) {
      throw validationError('quantity', 'This item requires quantity receipt only');
    }
    return stockService.increaseItemStock(connection, {
      storeId: warehouse.store_id,
      warehouseId: warehouse.id,
      itemId: item.id,
      item,
      quantity: toCanonicalQuantity(item, scoped.quantity),
      unitCost: scoped.unit_cost,
      movementType: 'purchase_receive',
      referenceType: 'stock_receipt',
      notes: scoped.notes,
      createdBy: userId
    });
  });
  return result;
}

async function adjustStock(data, userId, audit, actor = {}) {
  const scoped = scopedData(data, actor);
  const warehouse = await getWarehouse(scoped.warehouse_id, actor);
  const item = await getItem(scoped.item_id, actor);
  assertSameStore(item, warehouse.store_id, 'item_id', 'Item does not belong to this store');
  if (warehouse.status !== 'active') throw validationError('warehouse_id', 'Warehouse must be active');

  return withTransaction(async (connection) => {
    const result = await stockService.adjustItemStock(connection, {
      storeId: warehouse.store_id,
      warehouseId: warehouse.id,
      itemId: item.id,
      item,
      quantityChange: scoped.quantity_change === undefined
        ? undefined
        : toCanonicalQuantity(item, scoped.quantity_change, 'quantity_change'),
      cartonCountChange: scoped.carton_count_change,
      looseUnitsChange: scoped.loose_units_change,
      unitCost: scoped.unit_cost,
      costPerCarton: scoped.cost_per_carton,
      movementType: 'stock_adjustment',
      referenceType: 'stock_adjustment',
      notes: scoped.reason,
      createdBy: userId
    });
    await writeAuditLog(connection, {
      userId,
      module: 'inventory',
      action: 'stock_adjustment',
      tableName: 'item_stock_balances',
      recordId: result.stock_balance_id,
      storeId: warehouse.store_id,
      newValues: {
        warehouse_id: warehouse.id,
        item_id: item.id,
        quantity_after: result.quantity_after,
        quantity_reserved_after: result.quantity_reserved_after,
        stock_movement_id: result.stock_movement_id
      },
      ipAddress: audit?.ipAddress,
      userAgent: audit?.userAgent,
      description: scoped.reason
    });
    return result;
  });
}

module.exports = {
  adjustStock,
  createCategory,
  createItem,
  createUnit,
  createWarehouse,
  deleteCategory,
  deleteItem,
  deleteUnit,
  deleteWarehouse,
  getCategory,
  getItem,
  getUnit,
  getWarehouse,
  hardDeleteCategory,
  hardDeleteItem,
  listCartonLots,
  listCategories,
  listItems,
  listOpenCartonShelves,
  listStockAdjustments,
  listStockBalances,
  listStockMovements,
  listUnits,
  listWarehouses,
  receiveStock,
  updateCategory,
  updateItem,
  updateUnit,
  updateWarehouse
};
