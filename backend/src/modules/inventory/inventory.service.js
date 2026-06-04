const ApiError = require('../../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const inventoryModel = require('./inventory.model');
const locationModel = require('../locations/locations.model');
const stockService = require('./stock.service');

function pagedResult(resourceName, rows, total, pagination) {
  return {
    [resourceName]: rows,
    meta: getPaginationMeta({ ...pagination, total })
  };
}

function assertStockedVariant(variant, field = 'item_variant_id') {
  if (variant?.tracking_type !== 'stocked') {
    throw ApiError.badRequest('Validation failed', [
      { field, message: 'Item variant must belong to a stocked item' }
    ]);
  }

  return variant;
}

function assertPackagingUnitPc(unit, field = 'base_unit_id') {
  if (unit?.symbol !== 'pc') {
    throw ApiError.badRequest('Validation failed', [
      { field, message: 'Packaging materials must use pc as their stock unit' }
    ]);
  }

  return unit;
}

function isConstraintError(error) {
  return ['ER_ROW_IS_REFERENCED_2', 'ER_ROW_IS_REFERENCED', 'ER_NO_REFERENCED_ROW_2'].includes(error?.code);
}

async function runHardDelete(action, message) {
  try {
    await action();
  } catch (error) {
    if (isConstraintError(error)) {
      throw ApiError.conflict(message);
    }
    throw error;
  }
}

async function assertNoCategoryCycle(id, parentId, actor = {}) {
  let nextParentId = parentId;
  const visited = new Set();

  while (nextParentId) {
    if (Number(nextParentId) === Number(id) || visited.has(Number(nextParentId))) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'parent_id', message: 'Category hierarchy cannot contain cycles' }
      ]);
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
      throw ApiError.badRequest('Validation failed', [
        { field: 'base_unit_id', message: 'Unit hierarchy cannot contain cycles' }
      ]);
    }

    visited.add(Number(nextBaseUnitId));
    const baseUnit = await getUnit(nextBaseUnitId, actor);
    nextBaseUnitId = baseUnit.base_unit_id;
  }
}

function assertUnitCompatible(baseUnit, storeId, unitType) {
  assertSameStore(baseUnit, storeId, 'base_unit_id', 'Base unit does not belong to this store');
  if (baseUnit.unit_type !== unitType) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'base_unit_id', message: 'Base unit must use the same unit type' }
    ]);
  }
}

async function listCategories(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listCategories({
    filters: scopedQuery(query, actor),
    pagination
  });

  return pagedResult('categories', result.rows, result.total, pagination);
}

async function getCategory(id, actor = {}) {
  const category = await inventoryModel.findCategoryById(id);

  return assertRowInScope(category, actor, 'Category not found');
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
  const result = await inventoryModel.listUnits({
    filters: scopedQuery(query, actor),
    pagination
  });

  return pagedResult('units', result.rows, result.total, pagination);
}

async function getUnit(id, actor = {}) {
  const unit = await inventoryModel.findUnitById(id);

  return assertRowInScope(unit, actor, 'Unit not found');
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
  const result = await inventoryModel.listItems({
    filters: scopedQuery(query, actor),
    pagination
  });

  return pagedResult('items', result.rows, result.total, pagination);
}

async function getItem(id, actor = {}) {
  const item = await inventoryModel.findItemById(id);

  return assertRowInScope(item, actor, 'Item not found');
}

async function createItem(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const category = await getCategory(scoped.category_id, actor);
  const unit = await getUnit(scoped.base_unit_id, actor);
  assertSameStore(category, scoped.store_id, 'category_id', 'Category does not belong to this store');
  assertSameStore(unit, scoped.store_id, 'base_unit_id', 'Unit does not belong to this store');
  if (scoped.item_type === 'packaging') {
    assertPackagingUnitPc(unit);
  }

  return inventoryModel.createItem({
    ...scoped,
    created_by: userId
  });
}

async function updateItem(id, data, actor = {}) {
  const current = await getItem(id, actor);
  const { store_id, ...updates } = data;
  const nextItemType = updates.item_type || current.item_type;

  if (updates.category_id) {
    const category = await getCategory(updates.category_id, actor);
    assertSameStore(category, current.store_id, 'category_id', 'Category does not belong to this store');
  }

  let nextUnit = null;
  if (updates.base_unit_id) {
    nextUnit = await getUnit(updates.base_unit_id, actor);
    assertSameStore(nextUnit, current.store_id, 'base_unit_id', 'Unit does not belong to this store');
  } else if (nextItemType === 'packaging') {
    nextUnit = await getUnit(current.base_unit_id, actor);
  }

  if (nextItemType === 'packaging') {
    assertPackagingUnitPc(nextUnit);
  }

  return inventoryModel.updateItem(id, updates);
}

async function deleteItem(id, actor = {}) {
  await getItem(id, actor);

  const movementCount = await inventoryModel.countItemMovements(id);

  if (movementCount > 0) {
    throw ApiError.conflict('Item cannot be deleted because it has stock movement history');
  }

  await inventoryModel.deactivateItem(id);
}

async function hardDeleteItem(id, actor = {}) {
  await getItem(id, actor);
  await runHardDelete(
    () => inventoryModel.hardDeleteItem(id),
    'Item cannot be hard-deleted while variants, packaging materials, or history reference it'
  );
}

async function listVariants(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listVariants({
    filters: scopedQuery(query, actor),
    pagination
  });

  return pagedResult('item_variants', result.rows, result.total, pagination);
}

async function getVariant(id, actor = {}) {
  const variant = await inventoryModel.findVariantById(id);

  return assertRowInScope(variant, actor, 'Item variant not found');
}

async function createVariant(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const item = await getItem(scoped.item_id, actor);
  assertSameStore(item, scoped.store_id, 'item_id', 'Item does not belong to this store');
  return inventoryModel.createVariant(scoped);
}

async function updateVariant(id, data, actor = {}) {
  const current = await getVariant(id, actor);
  const { store_id, ...updates } = data;

  if (updates.item_id) {
    const item = await getItem(updates.item_id, actor);
    assertSameStore(item, current.store_id, 'item_id', 'Item does not belong to this store');
  }

  return inventoryModel.updateVariant(id, updates);
}

async function deleteVariant(id, actor = {}) {
  await getVariant(id, actor);

  const movementCount = await inventoryModel.countVariantMovements(id);

  if (movementCount > 0) {
    throw ApiError.conflict('Item variant cannot be deleted because it has stock movement history');
  }

  await inventoryModel.deactivateVariant(id);
}

async function hardDeleteVariant(id, actor = {}) {
  await getVariant(id, actor);
  await runHardDelete(
    () => inventoryModel.hardDeleteVariant(id),
    'Variant cannot be hard-deleted while stock, packaging, production, purchase, or dispatch history references it'
  );
}

async function listWarehouses(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listWarehouses({
    filters: scopedQuery(query, actor),
    pagination
  });

  return pagedResult('warehouses', result.rows, result.total, pagination);
}

async function getWarehouse(id, actor = {}) {
  const warehouse = await inventoryModel.findWarehouseById(id);

  return assertRowInScope(warehouse, actor, 'Warehouse not found');
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
  const result = await inventoryModel.listStockBalances({
    filters: scopedQuery(query, actor),
    pagination
  });

  return pagedResult('stock_balances', result.rows, result.total, pagination);
}

async function listStockMovements(query, actor = {}) {
  const pagination = getPagination(query);
  const result = await inventoryModel.listStockMovements({
    filters: scopedQuery(query, actor),
    pagination
  });

  return pagedResult('stock_movements', result.rows, result.total, pagination);
}

async function adjustStock(data, userId, audit, actor = {}) {
  const warehouse = await getWarehouse(data.warehouse_id, actor);
  const variant = await getVariant(data.item_variant_id, actor);
  assertSameStore(variant, warehouse.store_id, 'item_variant_id', 'Item variant does not belong to this store');
  assertStockedVariant(variant);

  return stockService.adjustStock({
    storeId: warehouse.store_id,
    warehouseId: data.warehouse_id,
    itemVariantId: data.item_variant_id,
    quantityChange: data.quantity_change,
    unitCost: data.unit_cost,
    reason: data.reason,
    createdBy: userId,
    audit
  });
}

module.exports = {
  adjustStock,
  createCategory,
  createItem,
  createUnit,
  createVariant,
  createWarehouse,
  deleteCategory,
  deleteItem,
  deleteUnit,
  deleteVariant,
  deleteWarehouse,
  getCategory,
  getItem,
  getUnit,
  getVariant,
  getWarehouse,
  hardDeleteCategory,
  hardDeleteItem,
  hardDeleteVariant,
  listCategories,
  listItems,
  listStockBalances,
  listStockMovements,
  listUnits,
  listVariants,
  listWarehouses,
  updateCategory,
  updateItem,
  updateUnit,
  updateVariant,
  updateWarehouse
};
