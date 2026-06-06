const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const inventoryModel = require('../inventory/inventory.model');
const stockService = require('../inventory/stock.service');
const productionModel = require('../production/production.model');
const model = require('./packaging.model');

const LEVELS = ['category', 'item', 'sub_item', 'sub_sub_item'];
const CAPACITY_UNIT_TO_KG = {
  g: 0.001,
  kg: 1,
  ton: 1000,
  pc: 1
};
const WEIGHT_UNIT_TO_KG = {
  g: 0.001,
  kg: 1,
  ton: 1000
};
const PREVIOUS_LEVEL = {
  category: null,
  item: 'category',
  sub_item: 'item',
  sub_sub_item: 'sub_item'
};

function pagedResult(resourceName, rows, total, pagination) {
  return {
    [resourceName]: rows,
    meta: getPaginationMeta({ ...pagination, total })
  };
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

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toPositiveNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function componentAttributes(component = {}) {
  const source = component || {};
  return parseJson(source.variant_attributes_json || source.attributes_json, {});
}

function componentCapacityKg(component = {}) {
  const source = component || {};
  const ownCapacity = toPositiveNumber(source.capacity_kg);
  if (ownCapacity) return ownCapacity;

  const attributes = componentAttributes(source);
  return toPositiveNumber(attributes.capacity_kg_per_pc ?? attributes.capacity_kg);
}

function normalizeCapacityKg(value, unitSymbol = 'pc') {
  if (value === undefined || value === null || value === '') return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return numericValue * (CAPACITY_UNIT_TO_KG[unitSymbol] || 1);
}

function normalizeWeightToKg(value, unitSymbol = 'kg') {
  if (value === undefined || value === null || value === '') return decimal(0);
  return decimal(value).mul(WEIGHT_UNIT_TO_KG[unitSymbol] || 1);
}

function withNormalizedComponentCapacity(component) {
  const capacity = componentCapacityKg(component);
  return {
    ...component,
    capacity_kg: capacity ? toMoney(capacity) : null
  };
}

async function getGroup(id, actor = {}) {
  const group = await model.findGroupById(id);
  assertRowInScope(group, actor, 'Packaging group not found');

  return {
    ...group,
    components: (await model.getGroupComponents(id)).map(withNormalizedComponentCapacity)
  };
}

async function validateVariant(id, field, storeId, options = {}) {
  const variant = await inventoryModel.findVariantById(id);

  if (!variant) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Variant not found' }]);
  }

  assertSameStore(variant, storeId, field, 'Variant does not belong to this store');

  if (variant.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Variant must be active' }]);
  }

  if (variant.tracking_type !== 'stocked') {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Variant must belong to a stocked item' }]);
  }

  if (options.itemType && variant.item_type !== options.itemType) {
    throw ApiError.badRequest('Validation failed', [
      { field, message: `Variant must belong to a ${options.itemType.replace(/_/g, ' ')} item` }
    ]);
  }

  return variant;
}

async function validateWarehouse(id, field, storeId) {
  if (!id) return null;
  const warehouse = await inventoryModel.findWarehouseById(id);

  if (!warehouse) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Warehouse not found' }]);
  }

  return assertSameStore(warehouse, storeId, field, 'Warehouse does not belong to this store');
}

async function validateGroupReferences(data, storeId) {
  if (data.charcoal_variant_id) {
    await validateVariant(data.charcoal_variant_id, 'charcoal_variant_id', storeId);
  }
  if (data.default_warehouse_id) {
    await validateWarehouse(data.default_warehouse_id, 'default_warehouse_id', storeId);
  }
}

async function createGroup(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  await validateGroupReferences(scoped, scoped.store_id);

  return model.createGroup({
    ...scoped,
    created_by: userId
  });
}

async function updateGroup(id, data, actor = {}) {
  const current = await getGroup(id, actor);
  const { store_id, ...updates } = data;
  await validateGroupReferences(updates, current.store_id);

  return model.updateGroup(id, updates);
}

function deriveQuantity(parent, child) {
  if (child.quantity_per_parent) {
    return Number(child.quantity_per_parent);
  }

  const parentCapacity = componentCapacityKg(parent);
  const childCapacity = componentCapacityKg(child);

  if (parentCapacity && childCapacity) {
    const quantity = Math.floor(parentCapacity / childCapacity);
    if (quantity > 0) return quantity;
  }

  return null;
}

function maxQuantityFromCapacity(parent, child) {
  const parentCapacity = componentCapacityKg(parent);
  const childCapacity = componentCapacityKg(child);

  if (!parentCapacity || !childCapacity) return null;
  return Math.floor(parentCapacity / childCapacity);
}

async function validateComponentPayload(group, data, current = null) {
  const next = { ...current, ...data };
  const hasCapacityInput = Object.prototype.hasOwnProperty.call(data, 'capacity_kg');
  const level = next.level_key;

  if (!LEVELS.includes(level)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'level_key', message: 'Invalid packaging level' }]);
  }

  const variant = await validateVariant(next.item_variant_id, 'item_variant_id', group.store_id, { itemType: 'packaging' });
  next.variant_attributes_json = variant.attributes_json;

  if (next.unit_symbol && !CAPACITY_UNIT_TO_KG[next.unit_symbol]) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'unit_symbol', message: 'Unit must be g, kg, ton, or pc' }
    ]);
  }

  const unitSymbol = next.unit_symbol || 'pc';
  if (hasCapacityInput) {
    next.capacity_kg = normalizeCapacityKg(next.capacity_kg, unitSymbol);
  }

  if (level === 'category' && next.parent_component_id) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'parent_component_id', message: 'Category components cannot have a parent' }
    ]);
  }

  let parent = null;

  if (level !== 'category') {
    if (!next.parent_component_id) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'parent_component_id', message: `${level.replace(/_/g, ' ')} requires a parent` }
      ]);
    }

    parent = await model.findComponentById(next.parent_component_id);
    if (!parent || Number(parent.packaging_group_id) !== Number(group.id)) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'parent_component_id', message: 'Parent component must belong to this packaging group' }
      ]);
    }

    if (current && Number(parent.id) === Number(current.id)) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'parent_component_id', message: 'Component cannot be its own parent' }
      ]);
    }

    if (parent.level_key !== PREVIOUS_LEVEL[level]) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'parent_component_id', message: `${level.replace(/_/g, ' ')} can only be connected to ${PREVIOUS_LEVEL[level].replace(/_/g, ' ')}` }
      ]);
    }
  }

  const quantity = deriveQuantity(parent, next);
  if (level !== 'category' && !quantity) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'quantity_per_parent',
        message: 'Enter quantity per parent, or set parent and child capacities so it can be calculated'
      }
    ]);
  }

  const maxQuantity = level === 'category' ? null : maxQuantityFromCapacity(parent, next);
  if (maxQuantity !== null && maxQuantity < 1) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'capacity_kg',
        message: 'Child capacity must be lower than or equal to the parent capacity'
      }
    ]);
  }
  if (maxQuantity !== null && quantity > maxQuantity) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'quantity_per_parent',
        message: `Quantity per parent cannot exceed ${maxQuantity} based on parent and child capacities`
      }
    ]);
  }

  return {
    ...next,
    parent_component_id: level === 'category' ? null : next.parent_component_id,
    quantity_per_parent: level === 'category' ? null : quantity,
    unit_symbol: unitSymbol,
    capacity_kg: next.capacity_kg === undefined || next.capacity_kg === '' ? null : next.capacity_kg
  };
}

async function addComponent(groupId, data, actor = {}) {
  const group = await getGroup(groupId, actor);
  const payload = await validateComponentPayload(group, data);

  return model.createComponent({
    store_id: group.store_id,
    packaging_group_id: groupId,
    parent_component_id: payload.parent_component_id,
    level_key: payload.level_key,
    item_variant_id: payload.item_variant_id,
    unit_symbol: payload.unit_symbol,
    quantity_per_parent: payload.quantity_per_parent,
    capacity_kg: payload.capacity_kg,
    sort_order: payload.sort_order || 0,
    notes: payload.notes
  });
}

async function updateComponent(id, data, actor = {}) {
  const current = await model.findComponentById(id);
  assertRowInScope(current, actor, 'Packaging component not found');
  const group = await getGroup(current.packaging_group_id, actor);
  const payload = await validateComponentPayload(group, data, current);

  return model.updateComponent(id, {
    parent_component_id: payload.parent_component_id,
    level_key: payload.level_key,
    item_variant_id: payload.item_variant_id,
    unit_symbol: payload.unit_symbol,
    quantity_per_parent: payload.quantity_per_parent,
    capacity_kg: payload.capacity_kg,
    sort_order: payload.sort_order,
    notes: payload.notes
  });
}

async function deleteComponent(id, actor = {}) {
  const current = await model.findComponentById(id);
  assertRowInScope(current, actor, 'Packaging component not found');
  const childCount = await model.countComponentChildren(id);

  if (childCount > 0) {
    throw ApiError.conflict('Packaging component cannot be deleted while child components are connected');
  }

  await model.deleteComponent(id);
}

function buildChildrenByParent(components) {
  const byParent = new Map();
  for (const component of components) {
    const key = component.parent_component_id ? Number(component.parent_component_id) : 0;
    byParent.set(key, [...(byParent.get(key) || []), component]);
  }
  return byParent;
}

function buildEffectiveCapacityMap(components, byParent) {
  const capacities = new Map();

  function effectiveCapacity(component) {
    const componentId = Number(component.id);
    if (capacities.has(componentId)) return capacities.get(componentId);

    const ownCapacity = componentCapacityKg(component);
    let childCapacity = null;

    for (const child of byParent.get(componentId) || []) {
      const childEffectiveCapacity = effectiveCapacity(child);
      const quantity = toPositiveNumber(child.quantity_per_parent);
      if (childEffectiveCapacity && quantity) {
        childCapacity = (childCapacity || 0) + childEffectiveCapacity * quantity;
      }
    }

    const value = ownCapacity && childCapacity
      ? Math.min(ownCapacity, childCapacity)
      : ownCapacity || childCapacity;
    capacities.set(componentId, value || null);
    return capacities.get(componentId);
  }

  for (const component of components) {
    effectiveCapacity(component);
  }

  return capacities;
}

function findPrimaryContainer(components, effectiveCapacityById) {
  return components.find((component) => componentCapacityKg(component))
    || components.find((component) => toPositiveNumber(effectiveCapacityById.get(Number(component.id))));
}

function calculateRequirements(group, charcoalQuantityKg, balances = [], options = {}) {
  const components = [...(group.components || [])].sort((a, b) => {
    const byLevel = LEVELS.indexOf(a.level_key) - LEVELS.indexOf(b.level_key);
    if (byLevel !== 0) return byLevel;
    return Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id);
  });

  if (components.length === 0) {
    throw ApiError.conflict('Packaging group must have at least one component');
  }

  const byParent = buildChildrenByParent(components);
  const effectiveCapacityById = buildEffectiveCapacityMap(components, byParent);

  const primary = findPrimaryContainer(components, effectiveCapacityById);
  if (!primary) {
    throw ApiError.conflict('Packaging group must include a container with capacity in kg');
  }

  const primaryEffectiveCapacity = effectiveCapacityById.get(Number(primary.id));
  const primaryCapacity = decimal(primaryEffectiveCapacity);
  if (primaryCapacity.lte(0)) {
    throw ApiError.conflict('Primary container capacity must be greater than zero');
  }

  const primaryCount = decimal(charcoalQuantityKg).div(primaryCapacity).ceil();
  const requiredById = new Map();
  const balanceByVariant = new Map(
    balances.map((balance) => [
      Number(balance.item_variant_id),
      Number(balance.quantity_on_hand || 0) - Number(balance.quantity_reserved || 0)
    ])
  );
  const charcoalAvailableQuantity = options.stockChecked
    ? options.charcoalAvailableQuantity || 0
    : null;

  function assign(component, parentQuantity) {
    let requiredQuantity;
    if (Number(component.id) === Number(primary.id)) {
      requiredQuantity = primaryCount;
    } else if (!component.parent_component_id) {
      const rootCapacity = toPositiveNumber(effectiveCapacityById.get(Number(component.id)));
      requiredQuantity = rootCapacity
        ? decimal(charcoalQuantityKg).div(rootCapacity).ceil()
        : decimal(1);
    } else {
      requiredQuantity = decimal(parentQuantity).mul(component.quantity_per_parent || 1);
    }

    requiredById.set(Number(component.id), requiredQuantity);
    for (const child of byParent.get(Number(component.id)) || []) {
      assign(child, requiredQuantity);
    }
  }

  for (const root of byParent.get(0) || []) {
    assign(root, decimal(1));
  }

  let totalCost = decimal(0);
  const requirements = components.map((component) => {
    const requiredQuantity = requiredById.get(Number(component.id)) || decimal(0);
    const unitCost = decimal(component.cost || 0);
    const total = requiredQuantity.mul(unitCost);
    const availableQuantity = balanceByVariant.get(Number(component.item_variant_id)) || 0;
    totalCost = totalCost.plus(total);

    return {
      component_id: component.id,
      parent_component_id: component.parent_component_id,
      level_key: component.level_key,
      item_variant_id: component.item_variant_id,
      item_name: component.item_name,
      variant_name: component.variant_name,
      sku: component.sku,
      unit_symbol: component.unit_symbol,
      quantity_per_parent: component.quantity_per_parent,
      capacity_kg: componentCapacityKg(component) ? toMoney(componentCapacityKg(component)) : null,
      effective_capacity_kg: toMoney(effectiveCapacityById.get(Number(component.id)) || 0),
      required_quantity: toMoney(requiredQuantity),
      available_quantity: toMoney(availableQuantity),
      shortage_quantity: toMoney(Math.max(0, Number(requiredQuantity) - availableQuantity)),
      unit_cost: toMoney(unitCost),
      total_cost: toMoney(total)
    };
  });
  const packagingCost = totalCost;
  const charcoalUnitCost = decimal(options.charcoalUnitCost || 0);
  const charcoalCost = decimal(charcoalQuantityKg).mul(charcoalUnitCost);
  const totalMaterialCost = packagingCost.plus(charcoalCost);
  const costPerPrimaryContainer = totalMaterialCost.div(primaryCount);

  return {
    packaging_group_id: group.id,
    packaging_group_name: group.name,
    charcoal_quantity_kg: toMoney(charcoalQuantityKg),
    charcoal_available_quantity: charcoalAvailableQuantity === null ? null : toMoney(charcoalAvailableQuantity),
    charcoal_shortage_quantity: charcoalAvailableQuantity === null
      ? null
      : toMoney(Math.max(0, Number(charcoalQuantityKg) - charcoalAvailableQuantity)),
    primary_container_component_id: primary.id,
    primary_container_item_name: primary.item_name,
    primary_container_variant_name: primary.variant_name,
    primary_container_sku: primary.sku,
    primary_container_name: `${primary.item_name} - ${primary.variant_name}`,
    primary_container_capacity_kg: toMoney(primaryEffectiveCapacity),
    primary_container_count: Number(primaryCount.toFixed(0)),
    charcoal_unit_cost: toMoney(charcoalUnitCost),
    total_charcoal_cost: toMoney(charcoalCost),
    total_packaging_cost: toMoney(packagingCost),
    total_cost: toMoney(totalMaterialCost),
    packaging_cost_per_kg: toMoney(packagingCost.div(charcoalQuantityKg)),
    cost_per_kg: toMoney(totalMaterialCost.div(charcoalQuantityKg)),
    cost_per_primary_container: toMoney(costPerPrimaryContainer),
    cost_per_packaging_group: toMoney(costPerPrimaryContainer),
    requirements
  };
}

function assertNoRequirementShortages(calculation) {
  if (decimal(calculation.charcoal_shortage_quantity || 0).gt(0)) {
    throw ApiError.conflict('Packaging assignment cannot be saved while raw charcoal stock is short');
  }

  const hasShortage = (calculation.requirements || []).some((requirement) => {
    const quantity = decimal(requirement.required_quantity || 0);
    if (quantity.lte(0)) return false;
    if (!requirement.parent_component_id && !Number(requirement.capacity_kg || 0)) return false;
    return decimal(requirement.shortage_quantity || 0).gt(0);
  });
  if (hasShortage) {
    throw ApiError.conflict('Packaging assignment cannot be saved while required materials are short');
  }
}

async function calculateGroup(groupId, data, actor = {}, warehouseId = null) {
  const group = await getGroup(groupId, actor);
  if (warehouseId) {
    await validateWarehouse(warehouseId, 'warehouse_id', group.store_id);
  }
  const charcoalVariantId = data.charcoal_variant_id || group.charcoal_variant_id || null;
  if (charcoalVariantId) {
    await validateVariant(charcoalVariantId, 'charcoal_variant_id', group.store_id);
  }
  const variantIds = group.components.map((component) => Number(component.item_variant_id));
  if (charcoalVariantId) {
    variantIds.push(Number(charcoalVariantId));
  }
  const balances = warehouseId
    ? await model.getWarehouseVariantBalances(warehouseId, [...new Set(variantIds)])
    : [];
  const charcoalVariantAvailable = balances
    .filter((balance) => Number(balance.item_variant_id) === Number(charcoalVariantId))
    .reduce((sum, balance) => sum.plus(decimal(balance.quantity_on_hand || 0).minus(balance.quantity_reserved || 0)), decimal(0));

  const charcoalQuantityKg = normalizeWeightToKg(data.charcoal_quantity_kg, data.charcoal_quantity_unit || 'kg');
  const charcoalUnitCost = charcoalVariantId ? await model.getVariantCost(charcoalVariantId, warehouseId) : 0;
  return calculateRequirements(group, charcoalQuantityKg, balances, {
    charcoalUnitCost,
    charcoalAvailableQuantity: charcoalVariantAvailable,
    stockChecked: Boolean(warehouseId)
  });
}

async function decreaseRawCharcoalStock(connection, assignment, data = {}, userId) {
  const rawMovement = await stockService.decreaseStock(connection, {
    storeId: assignment.store_id,
    warehouseId: assignment.warehouse_id,
    itemVariantId: assignment.charcoal_variant_id,
    quantity: assignment.charcoal_quantity_kg,
    quantityAlreadyNormalized: true,
    unitCost: null,
    movementType: 'production_consume',
    referenceType: 'packaging_assignment_raw',
    referenceId: assignment.id,
    notes: data.notes || assignment.notes || 'Packaging assignment raw charcoal consumption',
    createdBy: userId
  });

  return [{
    role: 'raw_charcoal',
    item_variant_id: assignment.charcoal_variant_id,
    required_quantity: toMoney(assignment.charcoal_quantity_kg),
    stock_movement_id: rawMovement.stock_movement_id,
    quantity_after: rawMovement.quantity_after
  }];
}

async function consumeAssignmentStock(connection, assignment, data = {}, userId) {
  const calculation = parseJson(assignment.calculation_json, assignment.calculation_json);
  const requirements = calculation?.requirements || [];

  if (!requirements.length) {
    throw ApiError.conflict('Packaging assignment has no calculated requirements');
  }

  const movements = [];
  movements.push(...await decreaseRawCharcoalStock(connection, assignment, data, userId));

  for (const requirement of requirements) {
    const quantity = decimal(requirement.required_quantity || 0);
    if (quantity.lte(0)) continue;
    if (!requirement.parent_component_id && !Number(requirement.capacity_kg || 0)) continue;

    const movement = await stockService.decreaseStock(connection, {
      storeId: assignment.store_id,
      warehouseId: assignment.warehouse_id,
      itemVariantId: requirement.item_variant_id,
      quantity,
      unitCost: requirement.unit_cost,
      movementType: 'production_consume',
      referenceType: 'packaging_assignment',
      referenceId: assignment.id,
      notes: data.notes || assignment.notes || 'Packaging assignment consumption',
      createdBy: userId
    });

    movements.push({
      role: 'packaging',
      component_id: requirement.component_id,
      item_variant_id: requirement.item_variant_id,
      required_quantity: toMoney(quantity),
      stock_movement_id: movement.stock_movement_id,
      quantity_after: movement.quantity_after
    });
  }

  const producedQuantity = decimal(assignment.primary_container_count || calculation.primary_container_count || 0);
  if (producedQuantity.lte(0)) {
    throw ApiError.conflict('Primary container count must be greater than zero');
  }

  await model.updateAssignment(connection, assignment.id, {
    status: 'consumed',
    produced_quantity: toMoney(producedQuantity),
    consumed_at: new Date(),
    consumed_by: userId,
    consumed_movements_json: movements
  });

  return movements;
}

async function createAssignment(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const group = await getGroup(scoped.packaging_group_id, actor);
  await validateWarehouse(scoped.warehouse_id, 'warehouse_id', scoped.store_id);
  await validateVariant(scoped.charcoal_variant_id, 'charcoal_variant_id', scoped.store_id);
  if (scoped.production_batch_id) {
    const batch = await productionModel.findProductionBatchById(scoped.production_batch_id);
    assertSameStore(batch, scoped.store_id, 'production_batch_id', 'Production batch does not belong to this store');
  }

  if (group.charcoal_variant_id && Number(group.charcoal_variant_id) !== Number(scoped.charcoal_variant_id)) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'charcoal_variant_id', message: 'Charcoal variant must match the packaging group default' }
    ]);
  }

  const charcoalQuantityKg = normalizeWeightToKg(scoped.charcoal_quantity_kg, scoped.charcoal_quantity_unit || 'kg');
  const calculation = await calculateGroup(group.id, {
    ...scoped,
    charcoal_quantity_kg: charcoalQuantityKg,
    charcoal_quantity_unit: 'kg'
  }, actor, scoped.warehouse_id);
  assertNoRequirementShortages(calculation);

  const assignmentId = await withTransaction(async (connection) => {
    const assignment = await model.createAssignment({
      store_id: scoped.store_id,
      packaging_group_id: scoped.packaging_group_id,
      warehouse_id: scoped.warehouse_id,
      charcoal_variant_id: scoped.charcoal_variant_id,
      output_item_variant_id: scoped.output_item_variant_id || null,
      charcoal_quantity_kg: toMoney(charcoalQuantityKg),
      primary_container_count: calculation.primary_container_count,
      total_packaging_cost: calculation.total_packaging_cost,
      cost_per_kg: calculation.cost_per_kg,
      status: 'calculated',
      produced_quantity: toMoney(calculation.primary_container_count),
      production_batch_id: scoped.production_batch_id || null,
      calculation_json: calculation,
      notes: scoped.notes,
      created_by: userId
    }, connection);

    await consumeAssignmentStock(connection, assignment, { notes: scoped.notes }, userId);
    return assignment.id;
  });

  return getAssignment(assignmentId, actor);
}

async function getAssignment(id, actor = {}) {
  const assignment = await model.findAssignmentById(id);
  assertRowInScope(assignment, actor, 'Packaging assignment not found');

  return {
    ...assignment,
    calculation_json: parseJson(assignment.calculation_json, null),
    consumed_movements_json: parseJson(assignment.consumed_movements_json, null)
  };
}

async function consumeAssignment(id, data = {}, userId, actor = {}) {
  const assignment = await getAssignment(id, actor);

  if (!['calculated', 'batched'].includes(assignment.status)) {
    throw ApiError.conflict('Only calculated or batched packaging assignments can be consumed');
  }

  await withTransaction(async (connection) => {
    await consumeAssignmentStock(connection, assignment, data, userId);
  });

  return getAssignment(id, actor);
}

async function hardDeleteAssignment(id, actor = {}) {
  await getAssignment(id, actor);
  await runHardDelete(
    () => model.deleteAssignment(id),
    'Packaging assignment cannot be hard-deleted while related history references it'
  );
}

module.exports = {
  addComponent,
  calculateGroup,
  createAssignment,
  createGroup,
  deleteComponent,
  deleteGroup: async (id, actor = {}) => {
    await getGroup(id, actor);
    return model.deactivateGroup(id);
  },
  hardDeleteGroup: async (id, actor = {}) => {
    await getGroup(id, actor);
    return runHardDelete(
      () => model.hardDeleteGroup(id),
      'Packaging group cannot be hard-deleted while assignments reference it'
    );
  },
  getGroup,
  getAssignment,
  hardDeleteAssignment,
  listAssignments: (query, actor = {}) => {
    const pagination = getPagination(query);
    return model.listAssignments(scopedQuery(query, actor)).then((result) =>
      pagedResult(
        'packaging_assignments',
        result.rows.map((row) => ({
          ...row,
          calculation_json: parseJson(row.calculation_json, null),
          consumed_movements_json: parseJson(row.consumed_movements_json, null)
        })),
        result.meta.total,
        pagination
      )
    );
  },
  listGroups: (query, actor = {}) => {
    const pagination = getPagination(query);
    return model.listGroups(scopedQuery(query, actor)).then((result) =>
      pagedResult('packaging_groups', result.rows, result.meta.total, pagination)
    );
  },
  consumeAssignment,
  updateComponent,
  updateGroup
};
