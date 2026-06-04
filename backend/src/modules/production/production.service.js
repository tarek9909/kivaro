const ApiError = require('../../utils/ApiError');
const { decimal, percent, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const inventoryModel = require('../inventory/inventory.model');
const stockService = require('../inventory/stock.service');
const packagingService = require('../packaging/packaging.service');
const model = require('./production.model');

async function getPackagingConfiguration(id, actor = {}) {
  const config = await model.findPackagingConfigurationById(id);
  assertRowInScope(config, actor, 'Packaging configuration not found');

  return {
    ...config,
    components: await model.getPackagingComponents(id)
  };
}

function getConsumableComponents(config) {
  const components = [...(config.components || [])];

  if (
    config.charcoal_variant_id &&
    decimal(config.charcoal_quantity_per_output || 0).gt(0)
  ) {
    components.unshift({
      id: null,
      packaging_configuration_id: config.id,
      component_item_variant_id: config.charcoal_variant_id,
      variant_name: config.charcoal_variant_name,
      sku: config.charcoal_sku,
      item_name: config.charcoal_item_name || 'Charcoal',
      quantity_per_output: config.charcoal_quantity_per_output,
      unit_id: config.charcoal_unit_id,
      unit_symbol: config.charcoal_unit_symbol,
      component_role: 'charcoal',
      waste_percentage: 0,
      is_implicit: true
    });
  }

  return components;
}

function assertConfigHasConsumables(config) {
  const components = getConsumableComponents(config);

  if (components.length === 0 && config.packaging_type !== 'custom') {
    throw ApiError.conflict('Packaging configuration must define at least one consumable component');
  }

  return components;
}

async function validateVariant(id, field, storeId) {
  const variant = await inventoryModel.findVariantById(id);

  if (!variant) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Item variant not found' }]);
  }

  assertSameStore(variant, storeId, field, 'Item variant does not belong to this store');
  if (variant.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Item variant must be active' }]);
  }
  if (variant.tracking_type !== 'stocked') {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Item variant must belong to a stocked item' }]);
  }

  return variant;
}

async function validateUnit(id, field, storeId) {
  if (!id) return null;
  const unit = await inventoryModel.findUnitById(id);

  if (!unit) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Unit not found' }]);
  }

  return assertSameStore(unit, storeId, field, 'Unit does not belong to this store');
}

async function conversionToBaseUnit(unitId, targetBaseUnitId, field, storeId) {
  if (!unitId || Number(unitId) === Number(targetBaseUnitId)) {
    return decimal(1);
  }

  let current = await validateUnit(unitId, field, storeId);
  let conversion = decimal(current.conversion_to_base || 1);
  const visited = new Set([Number(current.id)]);

  while (current.base_unit_id) {
    if (Number(current.base_unit_id) === Number(targetBaseUnitId)) {
      return conversion;
    }

    if (visited.has(Number(current.base_unit_id))) {
      break;
    }

    visited.add(Number(current.base_unit_id));
    current = await validateUnit(current.base_unit_id, field, storeId);
    conversion = conversion.mul(current.conversion_to_base || 1);
  }

  throw ApiError.badRequest('Validation failed', [
    { field, message: 'Unit must match the item base unit or convert to it' }
  ]);
}

async function validateUnitForVariant(unitId, variant, field, storeId) {
  await conversionToBaseUnit(unitId, variant.base_unit_id, field, storeId);
}

async function quantityWithWasteInBaseUnits(component, baseUnitId, storeId, multiplier = 1) {
  const conversion = await conversionToBaseUnit(
    component.unit_id,
    baseUnitId,
    'unit_id',
    storeId
  );

  return decimal(component.quantity_per_output)
    .mul(multiplier)
    .mul(decimal(1).plus(percent(component.waste_percentage)))
    .mul(conversion);
}

async function createPackagingConfiguration(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  await validateVariant(scoped.output_item_variant_id, 'output_item_variant_id', scoped.store_id);

  if (decimal(scoped.charcoal_quantity_per_output || 0).gt(0) && !scoped.charcoal_variant_id) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'charcoal_variant_id', message: 'Charcoal variant is required when charcoal quantity is greater than zero' }
    ]);
  }

  if (scoped.charcoal_variant_id) {
    const charcoalVariant = await validateVariant(scoped.charcoal_variant_id, 'charcoal_variant_id', scoped.store_id);
    if (scoped.charcoal_unit_id) {
      await validateUnitForVariant(scoped.charcoal_unit_id, charcoalVariant, 'charcoal_unit_id', scoped.store_id);
    }
  }

  return model.createPackagingConfiguration({ ...scoped, created_by: userId });
}

async function updatePackagingConfiguration(id, data, actor = {}) {
  const current = await getPackagingConfiguration(id, actor);
  const next = { ...current, ...data };
  if (decimal(next.charcoal_quantity_per_output || 0).gt(0) && !next.charcoal_variant_id) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'charcoal_variant_id', message: 'Charcoal variant is required when charcoal quantity is greater than zero' }
    ]);
  }
  if (data.output_item_variant_id) {
    await validateVariant(data.output_item_variant_id, 'output_item_variant_id', current.store_id);
  }
  const charcoalVariantId = next.charcoal_variant_id;
  if (charcoalVariantId) {
    const charcoalVariant = await validateVariant(charcoalVariantId, 'charcoal_variant_id', current.store_id);
    if (next.charcoal_unit_id) {
      await validateUnitForVariant(next.charcoal_unit_id, charcoalVariant, 'charcoal_unit_id', current.store_id);
    }
  }
  const { store_id, ...updates } = data;
  return model.updatePackagingConfiguration(id, updates);
}

async function addPackagingComponent(configId, data, actor = {}) {
  const config = await getPackagingConfiguration(configId, actor);
  const variant = await validateVariant(data.component_item_variant_id, 'component_item_variant_id', config.store_id);

  const unit = await inventoryModel.findUnitById(data.unit_id);

  if (!unit) {
    throw ApiError.badRequest('Validation failed', [{ field: 'unit_id', message: 'Unit not found' }]);
  }
  assertSameStore(unit, config.store_id, 'unit_id', 'Unit does not belong to this store');
  await validateUnitForVariant(data.unit_id, variant, 'unit_id', config.store_id);

  return model.addPackagingComponent({
    ...data,
    packaging_configuration_id: configId
  });
}

async function calculateConfigCost(configId, warehouseId = null, actor = {}) {
  const config = await getPackagingConfiguration(configId, actor);
  if (Number(config.is_active) !== 1) {
    throw ApiError.conflict('Packaging configuration must be active');
  }
  let total = decimal(0);
  const components = [];

  for (const component of assertConfigHasConsumables(config)) {
    const variant = await validateVariant(component.component_item_variant_id, 'component_item_variant_id', config.store_id);
    const cost = await model.getVariantCost(component.component_item_variant_id, warehouseId);
    const qtyWithWaste = await quantityWithWasteInBaseUnits(component, variant.base_unit_id, config.store_id);
    const componentCost = qtyWithWaste.mul(cost);

    total = total.plus(componentCost);
    components.push({
      ...component,
      quantity_with_waste: toMoney(qtyWithWaste),
      unit_cost: toMoney(cost),
      total_cost: toMoney(componentCost)
    });
  }

  return {
    packaging_configuration_id: configId,
    output_item_variant_id: config.output_item_variant_id,
    calculated_cost: toMoney(total),
    components
  };
}

async function getProductionBatch(id, actor = {}) {
  const batch = await model.findProductionBatchById(id);
  assertRowInScope(batch, actor, 'Production batch not found');

  return {
    ...batch,
    components: await model.getProductionBatchComponents(id)
  };
}

async function createProductionBatch(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const usesPackagingGroup = Boolean(scoped.packaging_group_id);
  const usesPackagingConfig = Boolean(scoped.packaging_configuration_id);

  if (usesPackagingGroup === usesPackagingConfig) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'packaging_group_id', message: 'Select either a packaging group or a production recipe' }
    ]);
  }

  let config = null;
  let group = null;
  let outputVariantId = scoped.output_item_variant_id;
  let charcoalVariantId = scoped.charcoal_variant_id;

  if (usesPackagingConfig) {
    config = await model.findPackagingConfigurationById(scoped.packaging_configuration_id);

    if (!config) throw ApiError.badRequest('Validation failed', [{ field: 'packaging_configuration_id', message: 'Packaging configuration not found' }]);
    assertSameStore(config, scoped.store_id, 'packaging_configuration_id', 'Packaging configuration does not belong to this store');
    if (Number(config.is_active) !== 1) {
      throw ApiError.badRequest('Validation failed', [{ field: 'packaging_configuration_id', message: 'Packaging configuration must be active' }]);
    }
    if (outputVariantId && Number(outputVariantId) !== Number(config.output_item_variant_id)) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'output_item_variant_id', message: 'Production batch output must match the packaging configuration output' }
      ]);
    }
    outputVariantId = outputVariantId || config.output_item_variant_id;
    charcoalVariantId = charcoalVariantId || config.charcoal_variant_id || null;
  } else {
    group = await packagingService.getGroup(scoped.packaging_group_id, actor);
    if (group.status !== 'active') {
      throw ApiError.badRequest('Validation failed', [{ field: 'packaging_group_id', message: 'Packaging group must be active' }]);
    }
    if (!outputVariantId) {
      throw ApiError.badRequest('Validation failed', [{ field: 'output_item_variant_id', message: 'Output variant is required for packaging group production' }]);
    }
    charcoalVariantId = charcoalVariantId || group.charcoal_variant_id;
    if (!charcoalVariantId) {
      throw ApiError.badRequest('Validation failed', [{ field: 'charcoal_variant_id', message: 'Charcoal variant is required for packaging group production' }]);
    }
    if (group.charcoal_variant_id && Number(group.charcoal_variant_id) !== Number(charcoalVariantId)) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'charcoal_variant_id', message: 'Charcoal variant must match the packaging group default' }
      ]);
    }
  }

  const warehouse = await inventoryModel.findWarehouseById(scoped.warehouse_id);

  if (!warehouse) throw ApiError.badRequest('Validation failed', [{ field: 'warehouse_id', message: 'Warehouse not found' }]);
  assertSameStore(warehouse, scoped.store_id, 'warehouse_id', 'Warehouse does not belong to this store');
  await validateVariant(outputVariantId, 'output_item_variant_id', scoped.store_id);
  if (charcoalVariantId) {
    await validateVariant(charcoalVariantId, 'charcoal_variant_id', scoped.store_id);
  }

  return model.createProductionBatch({
    store_id: scoped.store_id,
    batch_number: scoped.batch_number || createDocumentNumber('PB'),
    packaging_configuration_id: usesPackagingConfig ? scoped.packaging_configuration_id : null,
    packaging_group_id: usesPackagingGroup ? scoped.packaging_group_id : null,
    warehouse_id: scoped.warehouse_id,
    charcoal_variant_id: charcoalVariantId || null,
    output_item_variant_id: outputVariantId,
    planned_quantity: scoped.planned_quantity,
    notes: scoped.notes,
    created_by: userId
  });
}

async function startProductionBatch(id, actor = {}) {
  const batch = await getProductionBatch(id, actor);

  if (batch.status !== 'draft') {
    throw ApiError.conflict('Only draft production batches can be started');
  }

  await model.updateProductionBatch(id, { status: 'in_progress', started_at: new Date() });
  return getProductionBatch(id, actor);
}

async function completeProductionBatch(id, data, userId, actor = {}) {
  const scopedBatch = await getProductionBatch(id, actor);
  await withTransaction(async (connection) => {
    const batch = await model.lockProductionBatch(connection, id);

    if (!batch) throw ApiError.notFound('Production batch not found');

    if (!['draft', 'in_progress'].includes(batch.status)) {
      throw ApiError.conflict('Only draft or in-progress production batches can be completed');
    }

    const producedQuantity = data.produced_quantity || batch.planned_quantity;
    await validateVariant(batch.output_item_variant_id, 'output_item_variant_id', batch.store_id);
    let totalCost = decimal(0);
    let outputQuantity = decimal(producedQuantity);

    if (batch.packaging_group_id) {
      const group = await packagingService.getGroup(batch.packaging_group_id, actor);
      if (group.status !== 'active') {
        throw ApiError.conflict('Packaging group must be active');
      }
      const charcoalVariantId = batch.charcoal_variant_id || group.charcoal_variant_id;
      if (!charcoalVariantId) {
        throw ApiError.conflict('Production batch must have a charcoal variant');
      }
      if (group.charcoal_variant_id && Number(group.charcoal_variant_id) !== Number(charcoalVariantId)) {
        throw ApiError.conflict('Production batch charcoal no longer matches its packaging group');
      }

      await validateVariant(charcoalVariantId, 'charcoal_variant_id', batch.store_id);
      const charcoalUnitCost = await model.getVariantCost(charcoalVariantId, batch.warehouse_id);
      const charcoalQuantity = decimal(producedQuantity);
      const charcoalCost = charcoalQuantity.mul(charcoalUnitCost);
      totalCost = totalCost.plus(charcoalCost);

      await stockService.decreaseStock(connection, {
        storeId: scopedBatch.store_id,
        warehouseId: batch.warehouse_id,
        itemVariantId: charcoalVariantId,
        quantity: charcoalQuantity,
        unitCost: charcoalUnitCost,
        movementType: 'production_consume',
        referenceType: 'production_batch',
        referenceId: id,
        notes: data.notes || batch.notes,
        createdBy: userId
      });
      await model.createProductionBatchComponent(connection, {
        production_batch_id: id,
        component_item_variant_id: charcoalVariantId,
        planned_quantity: toMoney(charcoalQuantity),
        consumed_quantity: toMoney(charcoalQuantity),
        unit_cost: toMoney(charcoalUnitCost),
        total_cost: toMoney(charcoalCost)
      });

      const calculation = await packagingService.calculateGroup(
        batch.packaging_group_id,
        { charcoal_quantity_kg: producedQuantity },
        actor,
        batch.warehouse_id
      );
      outputQuantity = decimal(calculation.primary_container_count);

      for (const requirement of calculation.requirements || []) {
        if (!requirement.parent_component_id && !requirement.capacity_kg) continue;
        const requiredQuantity = decimal(requirement.required_quantity || 0);
        if (requiredQuantity.lte(0)) continue;

        const unitCost = decimal(requirement.unit_cost || 0);
        const componentCost = requiredQuantity.mul(unitCost);
        totalCost = totalCost.plus(componentCost);

        await stockService.decreaseStock(connection, {
          storeId: scopedBatch.store_id,
          warehouseId: batch.warehouse_id,
          itemVariantId: requirement.item_variant_id,
          quantity: requiredQuantity,
          unitCost: toMoney(unitCost),
          movementType: 'production_consume',
          referenceType: 'production_batch',
          referenceId: id,
          notes: data.notes || batch.notes,
          createdBy: userId
        });
        await model.createProductionBatchComponent(connection, {
          production_batch_id: id,
          component_item_variant_id: requirement.item_variant_id,
          planned_quantity: toMoney(requiredQuantity),
          consumed_quantity: toMoney(requiredQuantity),
          unit_cost: toMoney(unitCost),
          total_cost: toMoney(componentCost)
        });
      }
    } else {
      const config = await getPackagingConfiguration(batch.packaging_configuration_id, actor);
      if (Number(config.is_active) !== 1) {
        throw ApiError.conflict('Packaging configuration must be active');
      }
      if (Number(batch.output_item_variant_id) !== Number(config.output_item_variant_id)) {
        throw ApiError.conflict('Production batch output no longer matches its packaging configuration');
      }
      const components = assertConfigHasConsumables(config);

      for (const component of components) {
        const variant = await validateVariant(component.component_item_variant_id, 'component_item_variant_id', batch.store_id);
        const unitCost = await model.getVariantCost(component.component_item_variant_id, batch.warehouse_id);
        const consumedQuantity = await quantityWithWasteInBaseUnits(component, variant.base_unit_id, batch.store_id, producedQuantity);
        const componentCost = consumedQuantity.mul(unitCost);
        totalCost = totalCost.plus(componentCost);

        await stockService.decreaseStock(connection, {
          storeId: scopedBatch.store_id,
          warehouseId: batch.warehouse_id,
          itemVariantId: component.component_item_variant_id,
          quantity: consumedQuantity,
          unitCost,
          movementType: 'production_consume',
          referenceType: 'production_batch',
          referenceId: id,
          notes: data.notes || batch.notes,
          createdBy: userId
        });
        await model.createProductionBatchComponent(connection, {
          production_batch_id: id,
          component_item_variant_id: component.component_item_variant_id,
          planned_quantity: toMoney(consumedQuantity),
          consumed_quantity: toMoney(consumedQuantity),
          unit_cost: toMoney(unitCost),
          total_cost: toMoney(componentCost)
        });
      }
    }

    const costPerOutput = outputQuantity.eq(0)
      ? decimal(0)
      : totalCost.div(outputQuantity);

    await stockService.increaseStock(connection, {
      storeId: scopedBatch.store_id,
      warehouseId: batch.warehouse_id,
      itemVariantId: batch.output_item_variant_id,
      quantity: outputQuantity,
      unitCost: toMoney(costPerOutput),
      movementType: 'production_output',
      referenceType: 'production_batch',
      referenceId: id,
      notes: data.notes || batch.notes,
      createdBy: userId
    });
    await model.setProductionBatchStatus(connection, id, {
      status: 'completed',
      produced_quantity: toMoney(producedQuantity),
      total_component_cost: toMoney(totalCost),
      cost_per_output: toMoney(costPerOutput),
      completed_at: new Date()
    });
    await model.closePreviousCostHistory(connection, batch.output_item_variant_id);
    await model.createCostHistory(connection, {
      store_id: scopedBatch.store_id,
      item_variant_id: batch.output_item_variant_id,
      packaging_configuration_id: batch.packaging_configuration_id || null,
      calculated_cost: toMoney(costPerOutput),
      created_by: userId
    });
  });

  return getProductionBatch(id, actor);
}

async function cancelProductionBatch(id, actor = {}) {
  const batch = await getProductionBatch(id, actor);

  if (batch.status === 'completed') {
    throw ApiError.conflict('Completed production batches cannot be cancelled');
  }

  await model.updateProductionBatch(id, { status: 'cancelled' });
  return getProductionBatch(id, actor);
}

async function getPackagingComponent(id, actor = {}) {
  const component = await model.findPackagingComponentById(id);
  return assertRowInScope(component, actor, 'Packaging component not found');
}

async function updatePackagingComponent(id, data, actor = {}) {
  const component = await getPackagingComponent(id, actor);
  if (data.component_item_variant_id) {
    await validateVariant(data.component_item_variant_id, 'component_item_variant_id', component.store_id);
  }
  const variant = await validateVariant(
    data.component_item_variant_id || component.component_item_variant_id,
    'component_item_variant_id',
    component.store_id
  );
  if (data.unit_id) {
    const unit = await inventoryModel.findUnitById(data.unit_id);
    if (!unit) throw ApiError.badRequest('Validation failed', [{ field: 'unit_id', message: 'Unit not found' }]);
    assertSameStore(unit, component.store_id, 'unit_id', 'Unit does not belong to this store');
  }
  await validateUnitForVariant(data.unit_id || component.unit_id, variant, 'unit_id', component.store_id);
  return model.updatePackagingComponent(id, data);
}

async function deletePackagingComponent(id, actor = {}) {
  await getPackagingComponent(id, actor);
  return model.deletePackagingComponent(id);
}

module.exports = {
  addPackagingComponent,
  calculateConfigCost,
  cancelProductionBatch,
  completeProductionBatch,
  createPackagingConfiguration,
  createProductionBatch,
  deletePackagingComponent,
  deletePackagingConfiguration: async (id, actor = {}) => {
    await getPackagingConfiguration(id, actor);
    return model.deletePackagingConfiguration(id);
  },
  getPackagingConfiguration,
  getProductionBatch,
  listPackagingConfigurations: (query, actor = {}) => model.listPackagingConfigurations(scopedQuery(query, actor)),
  listProductCostHistory: (query, actor = {}) => model.listProductCostHistory(scopedQuery(query, actor)),
  listProductionBatches: (query, actor = {}) => model.listProductionBatches(scopedQuery(query, actor)),
  startProductionBatch,
  updatePackagingComponent,
  updatePackagingConfiguration
};
