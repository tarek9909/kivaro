const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const { query } = require('../../bootstrap/db');
const inventoryModel = require('../inventory/inventory.model');
const stockService = require('../inventory/stock.service');
const storeConfigService = require('../../services/storeConfig.service');
const model = require('./packaging.model');

const COMPONENT_ROLES = ['outer_sellable', 'inner_sellable', 'consumable'];
const NORMAL_ENTRY_TYPES = ['normal_carton', 'normal_weight', 'normal_piece'];
const READY_ENTRY_TYPES = ['ready_outer_carton', 'ready_inner_unit'];

function positive(value, field) {
  const parsed = decimal(value);
  if (!parsed.isFinite() || parsed.lte(0)) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Must be greater than zero' }]);
  }
  return parsed;
}

function wholePositive(value, field) {
  const parsed = positive(value, field);
  if (!parsed.isInteger()) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Must be a whole number' }]);
  }
  return parsed;
}

function assertActive(row, field, label) {
  if (!row || row.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field, message: `${label} must be active` }]);
  }
  return row;
}

async function findItem(id, field, storeId, connection = null) {
  const item = await inventoryModel.findItemById(id, connection);
  if (!item) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Item not found' }]);
  }
  assertSameStore(item, storeId, field, 'Item does not belong to this store');
  return item;
}

async function findWarehouse(id, field, storeId) {
  const warehouse = await inventoryModel.findWarehouseById(id);
  if (!warehouse) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Warehouse not found' }]);
  }
  assertSameStore(warehouse, storeId, field, 'Warehouse does not belong to this store');
  return assertActive(warehouse, field, 'Warehouse');
}

async function assertNormalInputItem(itemId, storeId, connection = null) {
  const item = await findItem(itemId, 'input_item_id', storeId, connection);
  assertActive(item, 'input_item_id', 'Input item');
  if (item.item_kind !== 'normal') {
    throw ApiError.badRequest('Validation failed', [{
      field: 'input_item_id',
      message: 'A packaging group input must be a normal item'
    }]);
  }
  if (!['carton', 'weight'].includes(item.stock_mode)) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'input_item_id',
      message: 'Packaging input must use carton or weight stock mode'
    }]);
  }
  return item;
}

function assertPackagingPieceItem(item, field) {
  assertActive(item, field, 'Packaging component item');
  if (item.item_kind !== 'packaging' || item.stock_mode !== 'piece') {
    throw ApiError.badRequest('Validation failed', [{
      field,
      message: 'Packaging components must be active packaging items stocked by piece'
    }]);
  }
  return item;
}

function componentNumber(component, field) {
  return positive(component.quantity_per_outer, field);
}

async function validateFlatComponents(components, storeId, connection = null) {
  if (!Array.isArray(components) || components.length < 2) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'components',
      message: 'A packaging group needs one outer and one inner sellable component'
    }]);
  }

  const roles = new Map();
  const seenItemIds = new Set();
  const normalized = [];
  for (const [index, component] of components.entries()) {
    const role = component.component_role;
    if (!COMPONENT_ROLES.includes(role)) {
      throw ApiError.badRequest('Validation failed', [{
        field: `components.${index}.component_role`,
        message: 'Invalid component role'
      }]);
    }
    const item = await findItem(component.item_id, `components.${index}.item_id`, storeId, connection);
    assertPackagingPieceItem(item, `components.${index}.item_id`);
    if (seenItemIds.has(Number(item.id))) {
      throw ApiError.badRequest('Validation failed', [{
        field: `components.${index}.item_id`,
        message: 'Each physical packaging item can only appear once in a group'
      }]);
    }
    seenItemIds.add(Number(item.id));
    const quantity = componentNumber(component, `components.${index}.quantity_per_outer`);
    if ((role === 'inner_sellable' || role === 'consumable') && !quantity.isInteger()) {
      throw ApiError.badRequest('Validation failed', [{
        field: `components.${index}.quantity_per_outer`,
        message: 'Inner sellable and consumable quantities must be whole pieces'
      }]);
    }
    if (!roles.has(role)) roles.set(role, []);
    roles.get(role).push({
      ...component,
      item,
      quantity_per_outer: toMoney(quantity),
      sort_order: component.sort_order ?? index
    });
    normalized.push(roles.get(role)[roles.get(role).length - 1]);
  }

  const outer = roles.get('outer_sellable') || [];
  const inner = roles.get('inner_sellable') || [];
  if (outer.length !== 1 || !decimal(outer[0].quantity_per_outer).eq(1)) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'components',
      message: 'A group must have exactly one outer sellable component with quantity one'
    }]);
  }
  if (inner.length !== 1) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'components',
      message: 'A group must have exactly one inner sellable component'
    }]);
  }

  const groupCapacity = decimal(inner[0].quantity_per_outer).mul(inner[0].item.max_content_weight_kg || 0);
  const outerCapacity = decimal(outer[0].item.max_content_weight_kg || 0);
  if (outerCapacity.lte(0) || !outerCapacity.eq(groupCapacity)) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'components',
      message: 'Outer package capacity must exactly equal the combined inner package capacity'
    }]);
  }

  return {
    components: normalized,
    outer: outer[0],
    inner: inner[0],
    group_capacity_kg: groupCapacity
  };
}

async function loadGroupConfiguration(groupId, actor = {}, connection = null, lock = false) {
  const group = connection && lock
    ? await model.lockGroupById(connection, groupId)
    : await model.findGroupById(groupId, connection);
  assertRowInScope(group, actor, 'Packaging group not found');
  const components = await model.getGroupComponents(groupId, connection, lock);
  const validated = await validateFlatComponents(components, group.store_id, connection);
  return { group, ...validated };
}

function ensurePackableCapacity(configuration) {
  if (configuration.group_capacity_kg.lte(0)) {
    throw ApiError.badRequest('Packaging group cannot be completed because its inner sellable item has zero content capacity');
  }
}

function calculateInputRequirement(inputItem, innerBagCapacityKg, innerQuantityPerOuter, outputCartonCount) {
  const outputCount = wholePositive(outputCartonCount, 'output_carton_count');
  const bagCapacity = decimal(innerBagCapacityKg);
  const innerQuantity = wholePositive(innerQuantityPerOuter, 'inner_quantity_per_outer');
  const rawQuantityKg = bagCapacity.mul(innerQuantity).mul(outputCount);
  if (!['carton', 'weight'].includes(inputItem.stock_mode)) {
    throw ApiError.badRequest('Packaging input must use carton or weight stock mode');
  }
  return {
    output_carton_count: outputCount,
    raw_quantity_kg: rawQuantityKg,
    inner_packages_required: outputCount.mul(innerQuantity)
  };
}

async function getBalanceSnapshot(warehouseId, itemId, connection = null, lock = false) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  const sql = `SELECT id, store_id, warehouse_id, item_id, quantity_on_hand, quantity_reserved, average_cost
     FROM item_stock_balances
     WHERE warehouse_id = ? AND item_id = ?
     LIMIT 1${suffix}`;
  const rows = connection
    ? (await connection.execute(sql, [warehouseId, itemId]))[0]
    : await query(sql, [warehouseId, itemId]);
  const balance = rows[0] || {
    quantity_on_hand: 0,
    quantity_reserved: 0,
    average_cost: 0
  };
  return {
    ...balance,
    available_quantity: decimal(balance.quantity_on_hand).minus(balance.quantity_reserved)
  };
}

function shortageFor({ label, required, available, unit }) {
  const needed = decimal(required);
  const actual = decimal(available);
  const shortage = needed.minus(actual);
  return {
    label,
    required_quantity: toMoney(needed),
    available_quantity: toMoney(actual),
    shortage_quantity: toMoney(shortage.gt(0) ? shortage : 0),
    unit,
    available: actual.gte(needed)
  };
}

function publicComponent(component, balance, required, totalCost) {
  const shortage = decimal(required).minus(balance.available_quantity);
  return {
    item_id: component.item.id,
    item_name: component.item.name,
    component_role: component.component_role,
    quantity_per_outer: component.quantity_per_outer,
    required_quantity: toMoney(required),
    available_quantity: toMoney(balance.available_quantity),
    unit_cost: toMoney(balance.average_cost || 0),
    total_cost: toMoney(totalCost),
    shortage_quantity: toMoney(shortage.gt(0) ? shortage : 0)
  };
}

async function buildPackagingPreview(groupId, data, actor = {}, connection = null, lock = false) {
  const configuration = await loadGroupConfiguration(groupId, actor, connection, lock);
  const { group, components, outer, inner, group_capacity_kg: groupCapacityKg } = configuration;
  if (group.status !== 'active') throw ApiError.conflict('Inactive packaging groups cannot be used');
  ensurePackableCapacity(configuration);

  const warehouseId = data.warehouse_id || group.default_warehouse_id;
  if (!warehouseId) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'warehouse_id',
      message: 'A warehouse is required when the group has no default warehouse'
    }]);
  }
  await findWarehouse(warehouseId, 'warehouse_id', group.store_id);
  const inputItem = await assertNormalInputItem(group.input_item_id, group.store_id, connection);
  const inputRequirement = calculateInputRequirement(
    inputItem,
    inner.item.max_content_weight_kg || 0,
    inner.quantity_per_outer,
    data.output_carton_count
  );
  const remainderComponentId = data.remainder_component_item_id || inner.item.id;
  if (Number(remainderComponentId) !== Number(inner.item.id)) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'remainder_component_item_id',
      message: 'The remainder container must be this group\'s designated inner packaging item'
    }]);
  }
  const inputBalance = await getBalanceSnapshot(warehouseId, inputItem.id, connection, lock);
  const shelfInput = { warehouse_id: warehouseId, input_item_id: inputItem.id, packaging_group_id: group.id, packaging_item_id: inner.item.id };
  const shelfRows = connection && lock
    ? await model.lockReusableShelfStocks(connection, shelfInput)
    : (await model.listReadyShelfStocks({ ...shelfInput, state: 'reusable', allRows: true })).rows;
  const remainderRows = connection && lock
    ? await model.lockReusableShelfRemainders(connection, shelfInput)
    : await query(`SELECT * FROM packaging_shelf_remainders WHERE warehouse_id = ? AND input_item_id = ? AND packaging_group_id = ? AND remaining_kg > 0 ORDER BY created_at ASC, id ASC`, [warehouseId, inputItem.id, group.id]);
  const packagesRequired = decimal(inputRequirement.inner_packages_required);
  const reusableAvailable = shelfRows.reduce((sum, row) => sum.plus(decimal(row.quantity)), decimal(0));
  const reusablePackagesUsed = reusableAvailable.gte(packagesRequired) ? packagesRequired : reusableAvailable;
  const kgAfterReusable = packagesRequired.minus(reusablePackagesUsed).mul(inner.item.max_content_weight_kg);
  const remainderAvailable = remainderRows.reduce((sum, row) => sum.plus(decimal(row.remaining_kg)), decimal(0));
  const unpackedKgUsed = remainderAvailable.gte(kgAfterReusable) ? kgAfterReusable : remainderAvailable;
  const newRawKgNeeded = kgAfterReusable.minus(unpackedKgUsed);
  const cartonsConsumed = inputItem.stock_mode === 'carton'
    ? (newRawKgNeeded.eq(0) ? decimal(0) : newRawKgNeeded.div(positive(inputItem.kg_per_carton, 'input_item_id')).ceil())
    : decimal(0);
  const rawKgConsumed = inputItem.stock_mode === 'carton' ? cartonsConsumed.mul(inputItem.kg_per_carton) : newRawKgNeeded;
  const cartonSurplusKg = rawKgConsumed.minus(newRawKgNeeded);
  const newShelfPackages = cartonSurplusKg.div(inner.item.max_content_weight_kg).floor();
  const newUnpackedRemainderKg = cartonSurplusKg.minus(newShelfPackages.mul(inner.item.max_content_weight_kg));
  const rawTotalCost = inputItem.stock_mode === 'carton'
    ? cartonsConsumed.mul(inputBalance.average_cost || 0)
    : newRawKgNeeded.mul(inputBalance.average_cost || 0);
  const componentPreviews = [];
  const shortages = [shortageFor({
    label: inputItem.name,
    required: inputItem.stock_mode === 'carton' ? cartonsConsumed : newRawKgNeeded,
    available: inputBalance.available_quantity,
    unit: inputItem.stock_mode === 'carton' ? 'cartons' : 'kg'
  })];
  let packagingCost = decimal(0);
  for (const component of components) {
    const required = component.component_role === 'inner_sellable'
      ? packagesRequired.minus(reusablePackagesUsed)
      : decimal(component.quantity_per_outer).mul(inputRequirement.output_carton_count);
    const balance = await getBalanceSnapshot(warehouseId, component.item.id, connection, lock);
    const totalCost = required.mul(balance.average_cost || 0);
    packagingCost = packagingCost.plus(totalCost);
    componentPreviews.push({ component, balance, required, totalCost });
    shortages.push(shortageFor({
      label: component.item.name,
      required,
      available: balance.available_quantity,
      unit: 'pc'
    }));
  }
  const totalCost = rawTotalCost.plus(packagingCost);
  const outputCount = inputRequirement.output_carton_count;
  const innerPerOuter = decimal(inner.quantity_per_outer);
  return {
    group,
    input_item: inputItem,
    warehouse_id: Number(warehouseId),
    output_carton_count: toMoney(outputCount),
    group_capacity_kg: toMoney(groupCapacityKg),
    input: {
      item_id: inputItem.id,
      item_name: inputItem.name,
      stock_mode: inputItem.stock_mode,
      raw_quantity_kg: toMoney(rawKgConsumed),
      raw_kg_needed_after_reuse: toMoney(newRawKgNeeded),
      cartons_consumed: toMoney(cartonsConsumed),
      unit_cost: toMoney(inputBalance.average_cost || 0),
      total_cost: toMoney(rawTotalCost),
      available_quantity: toMoney(inputBalance.available_quantity),
      reusable_shelf_packages_used: toMoney(reusablePackagesUsed),
      unpacked_shelf_kg_used: toMoney(unpackedKgUsed),
      new_shelf_packages: toMoney(newShelfPackages),
      new_unpacked_shelf_kg: toMoney(newUnpackedRemainderKg)
    },
    components: componentPreviews.map(({ component, balance, required, totalCost: componentCost }) =>
      publicComponent(component, balance, required, componentCost)
    ),
    output: {
      outer_item_id: outer.item.id,
      outer_item_name: outer.item.name,
      inner_item_id: inner.item.id,
      inner_item_name: inner.item.name,
      inner_quantity_per_outer: toMoney(innerPerOuter),
      total_inner_quantity: toMoney(innerPerOuter.mul(outputCount)),
      full_outer_cartons: toMoney(outputCount)
    },
    costs: {
      raw_cost: toMoney(rawTotalCost),
      packaging_cost: toMoney(packagingCost),
      total_cost: toMoney(totalCost),
      cost_per_outer: toMoney(totalCost.div(outputCount)),
      cost_per_inner: toMoney(totalCost.div(outputCount.mul(innerPerOuter)))
    },
    shortages,
    can_complete: shortages.every((entry) => entry.available),
    _configuration: configuration,
    _component_previews: componentPreviews,
    _input_requirement: { ...inputRequirement, reusablePackagesUsed, unpackedKgUsed, newRawKgNeeded, cartonsConsumed, rawKgConsumed, newShelfPackages, newUnpackedRemainderKg },
    _shelf_rows: shelfRows,
    _remainder_rows: remainderRows
  };
}

function removePrivatePreviewFields(preview) {
  const { _configuration, _component_previews, _input_requirement, _shelf_rows, _remainder_rows, ...publicPreview } = preview;
  return publicPreview;
}

function groupSnapshot(preview) {
  return {
    id: preview.group.id,
    name: preview.group.name,
    code: preview.group.code,
    capacity_kg: preview.group_capacity_kg,
    outer: preview._configuration.outer && {
      item_id: preview._configuration.outer.item.id,
      name: preview._configuration.outer.item.name,
      quantity_per_outer: preview._configuration.outer.quantity_per_outer,
      max_content_weight_kg: preview._configuration.outer.item.max_content_weight_kg
    },
    inner: preview._configuration.inner && {
      item_id: preview._configuration.inner.item.id,
      name: preview._configuration.inner.item.name,
      quantity_per_outer: preview._configuration.inner.quantity_per_outer,
      max_content_weight_kg: preview._configuration.inner.item.max_content_weight_kg
    },
    components: preview._component_previews.map(({ component }) => ({
      item_id: component.item.id,
      item_name: component.item.name,
      component_role: component.component_role,
      quantity_per_outer: component.quantity_per_outer,
      max_content_weight_kg: component.item.max_content_weight_kg
    }))
  };
}

function inputSnapshot(preview) {
  const { input_item: item, input } = preview;
  return {
    item_id: item.id,
    item_name: item.name,
    stock_mode: item.stock_mode,
    kg_per_carton: item.kg_per_carton,
    raw_quantity_kg: input.raw_quantity_kg,
    cartons_consumed: input.cartons_consumed,
    unit_cost: input.unit_cost
  };
}

async function createGroup(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  if (!Array.isArray(scoped.components)) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'components',
      message: 'A packaging group requires its complete flat component template'
    }]);
  }
  await assertNormalInputItem(scoped.input_item_id, scoped.store_id);
  if (scoped.default_warehouse_id) {
    await findWarehouse(scoped.default_warehouse_id, 'default_warehouse_id', scoped.store_id);
  }
  const groupId = await withTransaction(async (connection) => {
    const group = await model.createGroup({ ...scoped, created_by: userId }, connection);
    if (scoped.components !== undefined) {
      const validated = await validateFlatComponents(scoped.components, scoped.store_id, connection);
      await model.replaceGroupComponents(connection, group.id, scoped.store_id, validated.components);
    }
    return group.id;
  });
  return getGroup(groupId, actor);
}

async function getGroup(id, actor = {}) {
  const group = await model.findGroupById(id);
  assertRowInScope(group, actor, 'Packaging group not found');
  const components = await model.getGroupComponents(id);
  return { ...group, components };
}

async function updateGroup(id, data, actor = {}) {
  const existing = await model.findGroupById(id);
  assertRowInScope(existing, actor, 'Packaging group not found');
  const { components, store_id, ...updates } = data;
  if (updates.input_item_id) await assertNormalInputItem(updates.input_item_id, existing.store_id);
  if (updates.default_warehouse_id) await findWarehouse(updates.default_warehouse_id, 'default_warehouse_id', existing.store_id);
  await withTransaction(async (connection) => {
    await model.updateGroup(id, updates, connection);
    if (components !== undefined) {
      const validated = await validateFlatComponents(components, existing.store_id, connection);
      await model.replaceGroupComponents(connection, id, existing.store_id, validated.components);
    }
  });
  return getGroup(id, actor);
}

async function replaceComponents(id, components, actor = {}) {
  await withTransaction(async (connection) => {
    const group = await model.lockGroupById(connection, id);
    assertRowInScope(group, actor, 'Packaging group not found');
    const validated = await validateFlatComponents(components, group.store_id, connection);
    await model.replaceGroupComponents(connection, id, group.store_id, validated.components);
  });
  return getGroup(id, actor);
}

async function previewGroup(id, data, actor = {}) {
  return removePrivatePreviewFields(await buildPackagingPreview(id, data, actor));
}

async function listReadyShelfStock(input = {}, actor = {}) {
  const result = await model.listReadyShelfStocks(scopedQuery(input, actor));
  return result;
}

async function transferShelfStockToGift(id, quantityValue, userId, actor = {}) {
  const amount = wholePositive(quantityValue, 'quantity');
  return withTransaction(async (connection) => {
    const [rows] = await connection.execute('SELECT * FROM ready_shelf_stocks WHERE id = ? LIMIT 1 FOR UPDATE', [id]);
    const source = rows[0];
    assertRowInScope(source, actor, 'Shelf stock not found');
    if (source.state !== 'reusable' || decimal(source.quantity).lt(amount)) throw ApiError.conflict('Insufficient reusable shelf stock');
    const remaining = decimal(source.quantity).minus(amount);
    await model.updateReadyShelfStock(connection, source.id, { quantity: toMoney(remaining) });
    await model.createReadyShelfStockMovement(connection, { store_id: source.store_id, warehouse_id: source.warehouse_id, ready_shelf_stock_id: source.id, movement_type: 'state_transfer', quantity_change: toMoney(amount.negated()), quantity_before: source.quantity, quantity_after: toMoney(remaining), state_before: 'reusable', state_after: 'reusable', reference_type: 'shelf_stock_transfer', reference_id: source.id, created_by: userId });
    const giftId = await model.createReadyShelfStock(connection, { ...source, packaging_operation_id: source.packaging_operation_id, quantity: toMoney(amount), total_cost: 0, remaining_cost: 0, state: 'gift' });
    await model.createReadyShelfStockMovement(connection, { store_id: source.store_id, warehouse_id: source.warehouse_id, ready_shelf_stock_id: giftId, movement_type: 'state_transfer', quantity_change: toMoney(amount), quantity_before: 0, quantity_after: toMoney(amount), state_before: 'gift', state_after: 'gift', reference_type: 'shelf_stock_transfer', reference_id: source.id, created_by: userId });
    return { reusable_shelf_stock_id: source.id, gift_shelf_stock_id: giftId, quantity: toMoney(amount) };
  });
}

async function completePackaging(id, data, userId, actor = {}) {
  return withTransaction(async (connection) => {
    const preview = await buildPackagingPreview(id, data, actor, connection, true);
    if (!preview.can_complete) {
      throw ApiError.conflict('Packaging cannot be completed because one or more inputs are short');
    }
    const operationId = await model.createOperation(connection, {
      store_id: preview.group.store_id,
      operation_number: createDocumentNumber('PKG'),
      packaging_group_id: preview.group.id,
      input_item_id: preview.input_item.id,
      warehouse_id: preview.warehouse_id,
      output_carton_count: preview.output_carton_count,
      raw_quantity_kg: preview.input.raw_quantity_kg,
      raw_unit_cost: preview.input.unit_cost,
      packaging_cost: preview.costs.packaging_cost,
      total_cost: preview.costs.total_cost,
      cost_per_outer: preview.costs.cost_per_outer,
      cost_per_inner: preview.costs.cost_per_inner,
      group_snapshot_json: groupSnapshot(preview),
      input_snapshot_json: inputSnapshot(preview),
      completed_by: userId,
      notes: data.notes
    });

    const commonStockInput = {
      storeId: preview.group.store_id,
      warehouseId: preview.warehouse_id,
      movementType: 'packaging_consume',
      referenceType: 'packaging_operation',
      referenceId: operationId,
      notes: data.notes || `Packaging operation ${operationId}`,
      createdBy: userId
    };
    if (preview.input_item.stock_mode === 'carton' && preview._input_requirement.cartonsConsumed.gt(0)) {
      await stockService.consumeSealedCartons(connection, {
        ...commonStockInput,
        itemId: preview.input_item.id,
        cartonCount: preview._input_requirement.cartonsConsumed,
        item: preview.input_item
      });
    } else if (preview.input_item.stock_mode === 'weight' && preview._input_requirement.newRawKgNeeded.gt(0)) {
      await stockService.decreaseItemStock(connection, {
        ...commonStockInput,
        itemId: preview.input_item.id,
        quantity: preview._input_requirement.newRawKgNeeded,
        item: preview.input_item
      });
    }
    await model.createOperationComponent(connection, {
      packaging_operation_id: operationId,
      item_id: preview.input_item.id,
      component_role: 'raw_input',
      quantity_per_outer: toMoney(decimal(preview.input.raw_quantity_kg).div(preview.output_carton_count)),
      required_quantity: preview.input.raw_quantity_kg,
      consumed_quantity: preview.input.raw_quantity_kg,
      unit_cost: preview.input.unit_cost,
      total_cost: preview.input.total_cost,
      component_snapshot_json: inputSnapshot(preview)
    });

    for (const componentPreview of preview._component_previews) {
      const { component, required, totalCost } = componentPreview;
      await stockService.decreaseItemStock(connection, {
        ...commonStockInput,
        itemId: component.item.id,
        quantity: required,
        item: component.item
      });
      await model.createOperationComponent(connection, {
        packaging_operation_id: operationId,
        item_id: component.item.id,
        component_role: component.component_role,
        quantity_per_outer: component.quantity_per_outer,
        required_quantity: toMoney(required),
        consumed_quantity: toMoney(required),
        unit_cost: toMoney(componentPreview.balance.average_cost || 0),
        total_cost: toMoney(totalCost),
        component_snapshot_json: {
          item_id: component.item.id,
          item_name: component.item.name,
          item_code: component.item.code,
          component_role: component.component_role,
          quantity_per_outer: component.quantity_per_outer,
          unit_cost: toMoney(componentPreview.balance.average_cost || 0)
        }
      });
    }

    let remainingReusablePackages = decimal(preview._input_requirement.reusablePackagesUsed);
    for (const shelf of preview._shelf_rows) {
      if (remainingReusablePackages.lte(0)) break;
      const used = decimal(shelf.quantity).gte(remainingReusablePackages)
        ? remainingReusablePackages : decimal(shelf.quantity);
      const nextQuantity = decimal(shelf.quantity).minus(used);
      await model.updateReadyShelfStock(connection, shelf.id, { quantity: toMoney(nextQuantity) });
      await model.createReadyShelfStockMovement(connection, {
        store_id: preview.group.store_id, warehouse_id: preview.warehouse_id, ready_shelf_stock_id: shelf.id, movement_type: 'packaging_consume', quantity_change: toMoney(used.negated()),
        quantity_before: shelf.quantity, quantity_after: toMoney(nextQuantity), state_before: 'reusable', state_after: 'reusable',
        reference_type: 'packaging_operation', reference_id: operationId, notes: data.notes, created_by: userId
      });
      remainingReusablePackages = remainingReusablePackages.minus(used);
    }
    let remainingUnpackedKg = decimal(preview._input_requirement.unpackedKgUsed);
    for (const remainder of preview._remainder_rows) {
      if (remainingUnpackedKg.lte(0)) break;
      const used = decimal(remainder.remaining_kg).gte(remainingUnpackedKg)
        ? remainingUnpackedKg : decimal(remainder.remaining_kg);
      await model.updatePackagingShelfRemainder(connection, remainder.id, {
        remaining_kg: toMoney(decimal(remainder.remaining_kg).minus(used))
      });
      remainingUnpackedKg = remainingUnpackedKg.minus(used);
    }

    if (preview._input_requirement.newShelfPackages.gt(0)) {
      const shelfCost = decimal(preview.costs.total_cost).mul(preview._input_requirement.newShelfPackages)
        .div(decimal(preview.output.inner_quantity_per_outer).mul(preview.output_carton_count).plus(preview._input_requirement.newShelfPackages));
      const shelfId = await model.createReadyShelfStock(connection, {
        store_id: preview.group.store_id, packaging_operation_id: operationId, packaging_group_id: preview.group.id,
        warehouse_id: preview.warehouse_id, input_item_id: preview.input_item.id, packaging_item_id: preview._configuration.inner.item.id,
        unit_weight_kg: preview._configuration.inner.item.max_content_weight_kg,
        quantity: toMoney(preview._input_requirement.newShelfPackages), total_cost: toMoney(shelfCost), remaining_cost: toMoney(shelfCost), state: 'reusable'
      });
      await model.createReadyShelfStockMovement(connection, {
        store_id: preview.group.store_id, warehouse_id: preview.warehouse_id, ready_shelf_stock_id: shelfId, movement_type: 'production', quantity_change: toMoney(preview._input_requirement.newShelfPackages),
        quantity_before: 0, quantity_after: toMoney(preview._input_requirement.newShelfPackages), state_before: 'reusable', state_after: 'reusable',
        reference_type: 'packaging_operation', reference_id: operationId, notes: data.notes, created_by: userId
      });
    }
    if (preview._input_requirement.newUnpackedRemainderKg.gt(0)) {
      await model.createPackagingShelfRemainder(connection, {
        store_id: preview.group.store_id, source_packaging_operation_id: operationId, packaging_group_id: preview.group.id,
        warehouse_id: preview.warehouse_id, input_item_id: preview.input_item.id,
        remaining_kg: toMoney(preview._input_requirement.newUnpackedRemainderKg), remaining_cost: 0
      });
    }

    const containers = [];
    const count = Number(preview.output_carton_count);
    for (let index = 0; index < count; index += 1) {
      const containerId = await model.createReadyStockContainer(connection, {
        store_id: preview.group.store_id,
        packaging_operation_id: operationId,
        packaging_group_id: preview.group.id,
        warehouse_id: preview.warehouse_id,
        outer_item_id: preview._configuration.outer.item.id,
        inner_item_id: preview._configuration.inner.item.id,
        outer_name_snapshot: preview._configuration.outer.item.name,
        inner_name_snapshot: preview._configuration.inner.item.name,
        initial_inner_quantity: preview.output.inner_quantity_per_outer,
        remaining_inner_quantity: preview.output.inner_quantity_per_outer,
        capacity_kg: preview.group_capacity_kg,
        total_cost: preview.costs.cost_per_outer,
        remaining_cost: preview.costs.cost_per_outer,
        status: 'full'
      });
      containers.push(containerId);
      await model.createReadyStockMovement(connection, {
        store_id: preview.group.store_id,
        warehouse_id: preview.warehouse_id,
        ready_stock_container_id: containerId,
        movement_type: 'packaging_complete',
        inner_quantity_change: preview.output.inner_quantity_per_outer,
        inner_quantity_before: 0,
        inner_quantity_after: preview.output.inner_quantity_per_outer,
        cost_change: preview.costs.cost_per_outer,
        cost_before: 0,
        cost_after: preview.costs.cost_per_outer,
        reference_type: 'packaging_operation',
        reference_id: operationId,
        notes: data.notes,
        created_by: userId
      });
    }
    return {
      packaging_operation: await model.findOperationById(operationId, connection),
      ready_stock_container_ids: containers
    };
  });
}

async function validateCatalogTarget(data, storeId, connection = null) {
  const normal = NORMAL_ENTRY_TYPES.includes(data.entry_type);
  const ready = READY_ENTRY_TYPES.includes(data.entry_type);
  if (!normal && !ready) {
    throw ApiError.badRequest('Validation failed', [{ field: 'entry_type', message: 'Invalid sale catalog entry type' }]);
  }
  if (normal) {
    if (!data.item_id || data.packaging_group_id) {
      throw ApiError.badRequest('Validation failed', [{
        field: 'item_id', message: 'Normal sale offers require an item and cannot reference a packaging group'
      }]);
    }
    const item = await findItem(data.item_id, 'item_id', storeId, connection);
    assertActive(item, 'item_id', 'Item');
    if (item.item_kind !== 'normal') {
      throw ApiError.badRequest('Validation failed', [{ field: 'item_id', message: 'Normal sale offers require a normal item' }]);
    }
    const expected = {
      normal_carton: 'carton',
      normal_weight: 'weight',
      normal_piece: 'piece'
    }[data.entry_type];
    if (item.stock_mode !== expected) {
      throw ApiError.badRequest('Validation failed', [{
        field: 'entry_type', message: `This offer type requires an item using ${expected} stock mode`
      }]);
    }
    return { item, group: null };
  }
  if (!data.packaging_group_id || data.item_id) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'packaging_group_id', message: 'Ready-stock offers require a packaging group and cannot reference an item'
    }]);
  }
  const group = await model.findGroupById(data.packaging_group_id, connection);
  if (!group || Number(group.store_id) !== Number(storeId)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'packaging_group_id', message: 'Packaging group not found in this store' }]);
  }
  if (group.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field: 'packaging_group_id', message: 'Packaging group must be active' }]);
  }
  return { item: null, group };
}

function defaultCatalogName(entryType, target) {
  if (target.item) {
    const label = {
      normal_carton: 'Carton',
      normal_weight: 'Kg',
      normal_piece: 'Piece'
    }[entryType];
    return `${target.item.name} — ${label}`;
  }
  return `${target.group.name} — ${entryType === 'ready_outer_carton' ? 'Ready carton' : 'Ready bag'}`;
}

function defaultCatalogUnit(entryType) {
  return {
    normal_carton: 'carton',
    normal_weight: 'kg',
    normal_piece: 'piece',
    ready_outer_carton: 'carton',
    ready_inner_unit: 'bag'
  }[entryType];
}

async function createSaleCatalogEntry(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const target = await validateCatalogTarget(scoped, scoped.store_id);
  const duplicate = await model.findActiveSaleCatalogDuplicate(null, scoped);
  if (duplicate) throw ApiError.conflict('An active offer for this item or group and fulfillment type already exists');
  const vatSettings = await storeConfigService.getStoreVatSettings(scoped.store_id);
  return model.createSaleCatalogEntry({
    ...scoped,
    display_name: scoped.display_name || defaultCatalogName(scoped.entry_type, target),
    unit_label: scoped.unit_label || defaultCatalogUnit(scoped.entry_type),
    vat_rate: scoped.vat_rate ?? (vatSettings.enabled ? vatSettings.rate : 0),
    created_by: userId
  });
}

async function updateSaleCatalogEntry(id, data, actor = {}) {
  const current = await model.findSaleCatalogEntryById(id);
  assertRowInScope(current, actor, 'Sale catalog entry not found');
  const { store_id, ...updates } = data;
  const next = { ...current, ...updates, store_id: current.store_id };
  await validateCatalogTarget(next, current.store_id);
  if ((updates.entry_type || updates.item_id || updates.packaging_group_id || updates.status === 'active') && next.status === 'active') {
    const duplicate = await model.findActiveSaleCatalogDuplicate(null, next, id);
    if (duplicate) throw ApiError.conflict('An active offer for this item or group and fulfillment type already exists');
  }
  return model.updateSaleCatalogEntry(id, updates);
}

async function getSaleCatalogEntry(id, actor = {}) {
  const entry = await model.findSaleCatalogEntryById(id);
  return assertRowInScope(entry, actor, 'Sale catalog entry not found');
}

async function saleEntryAvailability(entry, warehouseId) {
  if (!warehouseId) return { available_quantity: null, available: true };
  if (NORMAL_ENTRY_TYPES.includes(entry.entry_type)) {
    if (entry.entry_type === 'normal_carton') {
      const rows = await query(
        `SELECT COALESCE(SUM(GREATEST(
           FLOOR(l.remaining_cartons - COALESCE(reserved.reserved_inventory_quantity, 0)),
           0
         )), 0) AS quantity
         FROM carton_stock_lots l
         LEFT JOIN (
           SELECT carton_stock_lot_id, SUM(inventory_quantity) AS reserved_inventory_quantity
           FROM dispatch_line_allocations
           WHERE allocation_type = 'carton_lot' AND status = 'reserved'
           GROUP BY carton_stock_lot_id
         ) reserved ON reserved.carton_stock_lot_id = l.id
         WHERE l.warehouse_id = ? AND l.item_id = ?`,
        [warehouseId, entry.item_id]
      );
      const quantity = decimal(rows[0]?.quantity || 0);
      return { available_quantity: toMoney(quantity), available: quantity.gt(0) };
    }
    const balance = await getBalanceSnapshot(warehouseId, entry.item_id);
    return {
      available_quantity: toMoney(balance.available_quantity),
      available: balance.available_quantity.gt(0)
    };
  }
  if (entry.entry_type === 'ready_outer_carton') {
    const rows = await query(
      `SELECT COUNT(*) AS quantity
       FROM ready_stock_containers rsc
       WHERE rsc.warehouse_id = ? AND rsc.packaging_group_id = ? AND rsc.status = 'full'
         AND rsc.remaining_inner_quantity = rsc.initial_inner_quantity
         AND NOT EXISTS (
           SELECT 1
           FROM dispatch_line_allocations dla
           WHERE dla.ready_stock_container_id = rsc.id AND dla.status = 'reserved'
         )`,
      [warehouseId, entry.packaging_group_id]
    );
    const quantity = decimal(rows[0]?.quantity || 0);
    return { available_quantity: toMoney(quantity), available: quantity.gt(0) };
  }
  const rows = await query(
    `SELECT COALESCE(SUM(GREATEST(
       rsc.remaining_inner_quantity - COALESCE(reserved.reserved_inner_quantity, 0),
       0
     )), 0) AS quantity
     FROM ready_stock_containers rsc
     LEFT JOIN (
       SELECT dla.ready_stock_container_id,
         SUM(CASE WHEN di.fulfillment_type = 'ready_inner_unit' THEN dla.allocated_quantity ELSE 0 END) AS reserved_inner_quantity,
         SUM(CASE WHEN di.fulfillment_type = 'ready_outer_carton' THEN dla.allocated_quantity ELSE 0 END) AS reserved_outer_quantity
       FROM dispatch_line_allocations dla
       JOIN dispatch_items di ON di.id = dla.dispatch_item_id
       WHERE dla.status = 'reserved' AND dla.ready_stock_container_id IS NOT NULL
       GROUP BY dla.ready_stock_container_id
     ) reserved ON reserved.ready_stock_container_id = rsc.id
     WHERE rsc.warehouse_id = ? AND rsc.packaging_group_id = ?
       AND rsc.status IN ('full', 'partial')
       AND COALESCE(reserved.reserved_outer_quantity, 0) = 0`,
    [warehouseId, entry.packaging_group_id]
  );
  const quantity = decimal(rows[0]?.quantity || 0);
  return { available_quantity: toMoney(quantity), available: quantity.gt(0) };
}

async function listSaleCatalogEntries(input, actor = {}, options = {}) {
  const scoped = scopedQuery(input, actor);
  const result = await model.listSaleCatalogEntries(scoped);
  if (!input.warehouse_id) return result;
  const entries = await Promise.all(result.rows.map(async (entry) => ({
    ...entry,
    ...(await saleEntryAvailability(entry, input.warehouse_id))
  })));
  return {
    ...result,
    rows: options.hideQuantities
      ? entries.map(({ available_quantity, ...entry }) => entry)
      : entries
  };
}

async function listPosCatalog(input, actor = {}) {
  const result = await listSaleCatalogEntries({
    ...input,
    status: 'active',
    is_pos_active: 1
  }, actor, { hideQuantities: true });
  return {
    ...result,
    rows: result.rows.filter((entry) => entry.available)
  };
}

module.exports = {
  assertCatalogOffer: async (id, actor = {}) => {
    const entry = await getSaleCatalogEntry(id, actor);
    if (entry.status !== 'active') throw ApiError.conflict('Sale catalog entry is inactive');
    return entry;
  },
  completePackaging,
  createGroup,
  createSaleCatalogEntry,
  deleteGroup: async (id, actor = {}) => {
    const group = await model.findGroupById(id);
    assertRowInScope(group, actor, 'Packaging group not found');
    await model.deactivateGroup(id);
  },
  getGroup,
  getOperation: async (id, actor = {}) => {
    const operation = await model.findOperationById(id);
    return assertRowInScope(operation, actor, 'Packaging operation not found');
  },
  getSaleCatalogEntry,
  listGroups: async (input, actor = {}) => model.listGroups(scopedQuery(input, actor)),
  listOperations: async (input, actor = {}) => model.listOperations(scopedQuery(input, actor)),
  listPosCatalog,
  listReadyStock: async (input, actor = {}) => model.listReadyStockContainers(scopedQuery(input, actor)),
  listReadyShelfStock,
  listSaleCatalogEntries,
  previewGroup,
  replaceComponents,
  transferShelfStockToGift,
  updateGroup,
  updateSaleCatalogEntry,
  _private: {
    buildPackagingPreview,
    calculateInputRequirement,
    validateFlatComponents
  }
};
