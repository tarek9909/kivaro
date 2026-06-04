const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { withTransaction } = require('../../utils/transaction');
const { assertPositiveQuantity } = require('../../utils/stock');
const { writeAuditLog } = require('../../middleware/audit.middleware');
const inventoryModel = require('./inventory.model');

async function getOrCreateBalance(connection, warehouseId, itemVariantId, storeId = null) {
  let balance = await inventoryModel.getStockBalanceForUpdate(
    connection,
    warehouseId,
    itemVariantId
  );

  if (!balance) {
    balance = await inventoryModel.createStockBalance(
      connection,
      warehouseId,
      itemVariantId,
      storeId
    );
  }

  return balance;
}

async function normalizeStockInput(connection, itemVariantId, quantity, unitCost = null) {
  const variant = await inventoryModel.findVariantById(itemVariantId, connection);
  if (variant?.base_unit_type === 'quantity' && !decimal(quantity).isInteger()) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'quantity',
        message: 'Piece-based stock quantities must be whole numbers'
      }
    ]);
  }

  if (variant?.base_unit_type !== 'weight') {
    return { quantity, unitCost, variant };
  }

  const conversion = decimal(variant.base_unit_conversion_to_base || 1);
  return {
    quantity: decimal(quantity).mul(conversion),
    unitCost: unitCost === null || unitCost === undefined ? unitCost : decimal(unitCost).div(conversion),
    variant
  };
}

function calculateWeightedAverageCost(balance, quantity, unitCost) {
  const currentQuantity = decimal(balance.quantity_on_hand);
  const currentAverageCost = decimal(balance.average_cost);
  const addedQuantity = decimal(quantity);
  const addedCost = unitCost === null || unitCost === undefined
    ? currentAverageCost
    : decimal(unitCost);
  const newQuantity = currentQuantity.plus(addedQuantity);

  if (newQuantity.eq(0)) {
    return decimal(0);
  }

  return currentQuantity
    .mul(currentAverageCost)
    .plus(addedQuantity.mul(addedCost))
    .div(newQuantity);
}

async function increaseStock(connection, input) {
  assertPositiveQuantity(input.quantity);
  const normalized = await normalizeStockInput(connection, input.itemVariantId, input.quantity, input.unitCost);

  const balance = await getOrCreateBalance(
    connection,
    input.warehouseId,
    input.itemVariantId,
    input.storeId
  );

  const quantityBefore = decimal(balance.quantity_on_hand);
  const quantityAfter = quantityBefore.plus(normalized.quantity);
  const averageCost = calculateWeightedAverageCost(
    balance,
    normalized.quantity,
    normalized.unitCost
  );

  await inventoryModel.updateStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter),
    average_cost: toMoney(averageCost)
  });

  const movementId = await inventoryModel.createStockMovement(connection, {
    store_id: input.storeId,
    warehouse_id: input.warehouseId,
    item_variant_id: input.itemVariantId,
    movement_type: input.movementType,
    quantity_change: toMoney(normalized.quantity),
    quantity_before: toMoney(quantityBefore),
    quantity_after: toMoney(quantityAfter),
    unit_cost: normalized.unitCost === null || normalized.unitCost === undefined ? normalized.unitCost : toMoney(normalized.unitCost),
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    notes: input.notes,
    created_by: input.createdBy
  });

  return {
    stock_balance_id: balance.id,
    stock_movement_id: movementId,
    quantity_before: toMoney(quantityBefore),
    quantity_after: toMoney(quantityAfter),
    average_cost: toMoney(averageCost)
  };
}

async function decreaseStock(connection, input) {
  assertPositiveQuantity(input.quantity);
  const normalized = await normalizeStockInput(connection, input.itemVariantId, input.quantity, input.unitCost);

  const balance = await getOrCreateBalance(
    connection,
    input.warehouseId,
    input.itemVariantId,
    input.storeId
  );

  const quantityBefore = decimal(balance.quantity_on_hand);
  const reservedQuantity = decimal(balance.quantity_reserved);
  const availableQuantity = quantityBefore.minus(reservedQuantity);
  const decreaseQuantity = decimal(normalized.quantity);

  if (availableQuantity.lt(decreaseQuantity)) {
    throw ApiError.conflict('Insufficient stock available');
  }

  const quantityAfter = quantityBefore.minus(decreaseQuantity);
  const unitCost = normalized.unitCost === null || normalized.unitCost === undefined
    ? balance.average_cost
    : normalized.unitCost;

  await inventoryModel.updateStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter),
    average_cost: toMoney(balance.average_cost)
  });

  const movementId = await inventoryModel.createStockMovement(connection, {
    store_id: input.storeId,
    warehouse_id: input.warehouseId,
    item_variant_id: input.itemVariantId,
    movement_type: input.movementType,
    quantity_change: toMoney(decreaseQuantity.negated()),
    quantity_before: toMoney(quantityBefore),
    quantity_after: toMoney(quantityAfter),
    unit_cost: unitCost === null || unitCost === undefined ? unitCost : toMoney(unitCost),
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    notes: input.notes,
    created_by: input.createdBy
  });

  return {
    stock_balance_id: balance.id,
    stock_movement_id: movementId,
    quantity_before: toMoney(quantityBefore),
    quantity_after: toMoney(quantityAfter),
    average_cost: toMoney(balance.average_cost)
  };
}

async function reserveStock(connection, input) {
  assertPositiveQuantity(input.quantity);
  const normalized = await normalizeStockInput(connection, input.itemVariantId, input.quantity);

  const balance = await getOrCreateBalance(
    connection,
    input.warehouseId,
    input.itemVariantId,
    input.storeId
  );

  const quantityBefore = decimal(balance.quantity_on_hand);
  const reservedBefore = decimal(balance.quantity_reserved);
  const reserveQuantity = decimal(normalized.quantity);
  const availableQuantity = quantityBefore.minus(reservedBefore);

  if (availableQuantity.lt(reserveQuantity)) {
    throw ApiError.conflict('Insufficient stock available');
  }

  const reservedAfter = reservedBefore.plus(reserveQuantity);
  await inventoryModel.updateStockBalance(connection, balance.id, {
    quantity_reserved: toMoney(reservedAfter)
  });

  if (input.movementType) {
    await inventoryModel.createStockMovement(connection, {
      store_id: input.storeId,
      warehouse_id: input.warehouseId,
      item_variant_id: input.itemVariantId,
      movement_type: input.movementType,
      quantity_change: toMoney(0),
      quantity_before: toMoney(quantityBefore),
      quantity_after: toMoney(quantityBefore),
      reserved_quantity_change: toMoney(reserveQuantity),
      reserved_quantity_before: toMoney(reservedBefore),
      reserved_quantity_after: toMoney(reservedAfter),
      reference_type: input.referenceType,
      reference_id: input.referenceId,
      notes: input.notes,
      created_by: input.createdBy
    });
  }

  return {
    stock_balance_id: balance.id,
    quantity_on_hand: toMoney(quantityBefore),
    quantity_reserved_before: toMoney(reservedBefore),
    quantity_reserved_after: toMoney(reservedAfter),
    quantity_available_after: toMoney(quantityBefore.minus(reservedAfter))
  };
}

async function releaseReservedStock(connection, input) {
  assertPositiveQuantity(input.quantity);
  const normalized = await normalizeStockInput(connection, input.itemVariantId, input.quantity);

  const balance = await getOrCreateBalance(
    connection,
    input.warehouseId,
    input.itemVariantId,
    input.storeId
  );

  const reservedBefore = decimal(balance.quantity_reserved);
  const releaseQuantity = decimal(normalized.quantity);
  const quantityOnHand = decimal(balance.quantity_on_hand);

  if (reservedBefore.lt(releaseQuantity)) {
    throw ApiError.conflict('Reserved stock cannot be released below zero');
  }

  const reservedAfter = reservedBefore.minus(releaseQuantity);
  await inventoryModel.updateStockBalance(connection, balance.id, {
    quantity_reserved: toMoney(reservedAfter)
  });

  if (input.movementType) {
    await inventoryModel.createStockMovement(connection, {
      store_id: input.storeId,
      warehouse_id: input.warehouseId,
      item_variant_id: input.itemVariantId,
      movement_type: input.movementType,
      quantity_change: toMoney(0),
      quantity_before: toMoney(quantityOnHand),
      quantity_after: toMoney(quantityOnHand),
      reserved_quantity_change: toMoney(releaseQuantity.negated()),
      reserved_quantity_before: toMoney(reservedBefore),
      reserved_quantity_after: toMoney(reservedAfter),
      reference_type: input.referenceType,
      reference_id: input.referenceId,
      notes: input.notes,
      created_by: input.createdBy
    });
  }

  return {
    stock_balance_id: balance.id,
    quantity_reserved_before: toMoney(reservedBefore),
    quantity_reserved_after: toMoney(reservedAfter)
  };
}

async function adjustStock(input) {
  if (decimal(input.quantityChange).eq(0)) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'quantity_change',
        message: 'Quantity change cannot be zero'
      }
    ]);
  }

  return withTransaction(async (connection) => {
    const result = decimal(input.quantityChange).gt(0)
      ? await increaseStock(connection, {
        warehouseId: input.warehouseId,
        itemVariantId: input.itemVariantId,
        quantity: input.quantityChange,
        unitCost: input.unitCost,
        movementType: 'adjustment',
        referenceType: 'stock_adjustment',
        referenceId: null,
        notes: input.reason,
        createdBy: input.createdBy,
        storeId: input.storeId
      })
      : await decreaseStock(connection, {
        warehouseId: input.warehouseId,
        itemVariantId: input.itemVariantId,
        quantity: decimal(input.quantityChange).abs(),
        unitCost: input.unitCost,
        movementType: 'adjustment',
        referenceType: 'stock_adjustment',
        referenceId: null,
        notes: input.reason,
        createdBy: input.createdBy,
        storeId: input.storeId
      });

    await writeAuditLog(connection, {
      userId: input.createdBy,
      module: 'inventory',
      action: 'stock_adjustment',
      tableName: 'stock_balances',
      recordId: result.stock_balance_id,
      storeId: input.storeId,
      newValues: {
        warehouse_id: input.warehouseId,
        item_variant_id: input.itemVariantId,
        quantity_change: toMoney(input.quantityChange),
        quantity_after: result.quantity_after,
        stock_movement_id: result.stock_movement_id
      },
      ipAddress: input.audit && input.audit.ipAddress,
      userAgent: input.audit && input.audit.userAgent,
      description: input.reason || 'Manual stock adjustment'
    });

    return result;
  });
}

module.exports = {
  adjustStock,
  decreaseStock,
  increaseStock,
  releaseReservedStock,
  reserveStock
};
