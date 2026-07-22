const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { assertPositiveQuantity } = require('../../utils/stock');
const inventoryModel = require('./inventory.model');

function validationError(field, message) {
  return ApiError.badRequest('Validation failed', [{ field, message }]);
}

function assertWholeNumber(value, field) {
  if (!decimal(value).isInteger()) {
    throw validationError(field, 'Quantity must be a whole number');
  }
}

function assertCanonicalItem(item) {
  if (!item || !['normal', 'packaging'].includes(item.item_kind)) {
    throw validationError('item_id', 'Item is not configured for canonical inventory');
  }
  if (!['carton_weight', 'weight', 'piece'].includes(item.stock_mode)) {
    throw validationError('stock_mode', 'Item stock mode is invalid');
  }
  if (item.item_kind === 'packaging' && item.stock_mode !== 'piece') {
    throw validationError('stock_mode', 'Packaging items must use piece stock mode');
  }
  return item;
}

function cartonUnitWeight(item) {
  assertCanonicalItem(item);
  if (item.stock_mode !== 'carton_weight') {
    throw validationError('item_id', 'Item does not use carton-weight stock');
  }
  const kgPerCarton = decimal(item.kg_per_carton);
  const looseUnits = decimal(item.loose_units_per_carton);
  if (kgPerCarton.lte(0) || looseUnits.lte(0) || !looseUnits.isInteger()) {
    throw validationError('item_id', 'Carton-weight item configuration is incomplete');
  }
  return kgPerCarton.div(looseUnits);
}

function normalizeQuantity(item, quantity, field = 'quantity', options = {}) {
  assertPositiveQuantity(quantity, field);
  const normalized = decimal(quantity);
  assertCanonicalItem(item);

  if (item.stock_mode === 'piece' && !normalized.isInteger()) {
    throw validationError(field, 'Piece-based stock quantities must be whole numbers');
  }

  if (item.stock_mode === 'carton_weight' && options.requireLooseUnitMultiple) {
    const unitWeight = cartonUnitWeight(item);
    if (!normalized.div(unitWeight).isInteger()) {
      throw validationError(field, 'Carton-weight quantity must match a whole number of loose units');
    }
  }

  return normalized;
}

function calculateWeightedAverageCost(balance, addedQuantity, unitCost) {
  const currentQuantity = decimal(balance.quantity_on_hand);
  const currentAverageCost = decimal(balance.average_cost);
  const incomingQuantity = decimal(addedQuantity);
  const incomingCost = unitCost === undefined || unitCost === null
    ? currentAverageCost
    : decimal(unitCost);
  const nextQuantity = currentQuantity.plus(incomingQuantity);
  if (nextQuantity.eq(0)) return decimal(0);
  return currentQuantity
    .mul(currentAverageCost)
    .plus(incomingQuantity.mul(incomingCost))
    .div(nextQuantity);
}

async function resolveItem(connection, input) {
  const item = input.item || await inventoryModel.findItemById(input.itemId, connection);
  if (!item) {
    throw ApiError.notFound('Item not found');
  }
  assertCanonicalItem(item);
  if (item.status !== 'active' && !input.allowInactive) {
    throw ApiError.conflict('Inactive items cannot move stock');
  }
  return item;
}

async function getItemBalanceForUpdate(connection, warehouseId, itemId, storeId = null) {
  return inventoryModel.getOrCreateItemStockBalanceForUpdate(connection, {
    store_id: storeId,
    warehouse_id: warehouseId,
    item_id: itemId
  });
}

function availableQuantity(balance) {
  return decimal(balance.quantity_on_hand).minus(decimal(balance.quantity_reserved));
}

function assertBalanceCanConsume(balance, quantity, { consumeReserved = false } = {}) {
  const requested = decimal(quantity);
  const onHand = decimal(balance.quantity_on_hand);
  const reserved = decimal(balance.quantity_reserved);
  if (consumeReserved) {
    if (onHand.lt(requested) || reserved.lt(requested)) {
      throw ApiError.conflict('Insufficient reserved stock available');
    }
    return;
  }
  if (onHand.minus(reserved).lt(requested)) {
    throw ApiError.conflict('Insufficient stock available');
  }
}

async function writeMovement(connection, input) {
  const unitCost = input.unitCost === undefined || input.unitCost === null ? null : decimal(input.unitCost);
  const totalCost = input.totalCost === undefined || input.totalCost === null
    ? (unitCost === null ? null : decimal(input.quantityChange || 0).abs().mul(unitCost))
    : decimal(input.totalCost);
  return inventoryModel.createItemStockMovement(connection, {
    store_id: input.storeId,
    warehouse_id: input.warehouseId,
    item_id: input.itemId,
    movement_type: input.movementType,
    quantity_change: toMoney(input.quantityChange || 0),
    quantity_before: toMoney(input.quantityBefore || 0),
    quantity_after: toMoney(input.quantityAfter || 0),
    reserved_quantity_change: toMoney(input.reservedQuantityChange || 0),
    reserved_quantity_before: toMoney(input.reservedQuantityBefore || 0),
    reserved_quantity_after: toMoney(input.reservedQuantityAfter || 0),
    unit_cost: unitCost === null ? null : toMoney(unitCost),
    total_cost: totalCost === null ? null : toMoney(totalCost),
    carton_stock_lot_id: input.cartonStockLotId,
    open_carton_shelf_id: input.openCartonShelfId,
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    notes: input.notes,
    created_by: input.createdBy
  });
}

function resultForBalance(balance, movementId, extras = {}) {
  const onHand = extras.quantityAfter === undefined ? decimal(balance.quantity_on_hand) : decimal(extras.quantityAfter);
  const reserved = extras.reservedAfter === undefined ? decimal(balance.quantity_reserved) : decimal(extras.reservedAfter);
  return {
    stock_balance_id: balance.id,
    stock_movement_id: movementId,
    quantity_before: extras.quantityBefore === undefined ? toMoney(balance.quantity_on_hand) : toMoney(extras.quantityBefore),
    quantity_after: toMoney(onHand),
    quantity_reserved_before: extras.reservedBefore === undefined ? toMoney(balance.quantity_reserved) : toMoney(extras.reservedBefore),
    quantity_reserved_after: toMoney(reserved),
    quantity_available_after: toMoney(onHand.minus(reserved)),
    average_cost: extras.averageCost === undefined ? toMoney(balance.average_cost) : toMoney(extras.averageCost),
    ...extras
  };
}

/**
 * A balance is locked by every stock mutation before this runs, so comparing
 * the before/after available quantity is enough to make this transition
 * based.  That avoids a new notification on every subsequent movement while
 * the balance remains below its reorder level.
 *
 * Notifications are deliberately written through the current transaction:
 * an inventory movement that rolls back must not leave a false low-stock
 * alert behind.  The defensive result checks keep small unit-test connection
 * doubles from needing to emulate mysql2 result tuples.
 */
async function notifyLowStockTransition(connection, input) {
  const reorderLevel = decimal(input.item?.reorder_level);
  if (reorderLevel.lte(0) || !connection || typeof connection.execute !== 'function') return;

  const beforeAvailable = decimal(input.quantityBefore).minus(decimal(input.reservedBefore));
  const afterAvailable = decimal(input.quantityAfter).minus(decimal(input.reservedAfter));
  if (beforeAvailable.lte(reorderLevel) || afterAvailable.gt(reorderLevel)) return;

  const storeId = input.storeId || input.item?.store_id || input.balance?.store_id;
  if (!storeId) return;

  const recipientResult = await connection.execute(
    `SELECT DISTINCT u.id
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.store_id = ?
       AND u.status = 'active'
       AND u.deleted_at IS NULL
       AND p.permission_key = 'dashboard.view'`,
    [storeId]
  );
  const recipients = Array.isArray(recipientResult) && Array.isArray(recipientResult[0])
    ? recipientResult[0]
    : [];
  if (!recipients.length) return;

  const title = `Low stock: ${input.item.name || `Item #${input.item.id}`}`;
  const message = `Available stock is ${toMoney(afterAvailable)} (reorder level ${toMoney(reorderLevel)}) in warehouse #${input.warehouseId}.`;
  await Promise.all(recipients.map((recipient) => connection.execute(
    `INSERT INTO notifications (
      store_id, user_id, title, message, notification_type, reference_type, reference_id
    ) VALUES (?, ?, ?, ?, 'warning', 'item_stock_balance', ?)`,
    [storeId, recipient.id, title, message, input.balance.id]
  )));
}

async function increaseItemStock(connection, input) {
  const item = await resolveItem(connection, input);
  if (item.stock_mode === 'carton_weight' && !input.allowCartonWeightQuantity) {
    throw validationError('item_id', 'Carton-weight stock must be received by carton count');
  }
  const quantity = normalizeQuantity(item, input.quantity, 'quantity');
  const balance = await getItemBalanceForUpdate(connection, input.warehouseId, item.id, input.storeId);
  const quantityBefore = decimal(balance.quantity_on_hand);
  const quantityAfter = quantityBefore.plus(quantity);
  const unitCost = input.unitCost === undefined || input.unitCost === null
    ? (item.default_cost === undefined || item.default_cost === null ? balance.average_cost : item.default_cost)
    : input.unitCost;
  const averageCost = calculateWeightedAverageCost(balance, quantity, unitCost);

  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter),
    average_cost: toMoney(averageCost)
  });
  const movementId = await writeMovement(connection, {
    ...input,
    itemId: item.id,
    quantityChange: quantity,
    quantityBefore,
    quantityAfter,
    reservedQuantityBefore: balance.quantity_reserved,
    reservedQuantityAfter: balance.quantity_reserved,
    unitCost
  });
  await notifyLowStockTransition(connection, {
    item,
    balance,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
    quantityBefore,
    quantityAfter,
    reservedBefore: balance.quantity_reserved,
    reservedAfter: balance.quantity_reserved
  });
  return resultForBalance(balance, movementId, {
    quantityBefore,
    quantityAfter,
    averageCost,
    item_id: item.id
  });
}

async function decreaseStandardItemStock(connection, item, input, quantity) {
  const balance = await getItemBalanceForUpdate(connection, input.warehouseId, item.id, input.storeId);
  assertBalanceCanConsume(balance, quantity, input);
  const quantityBefore = decimal(balance.quantity_on_hand);
  const reservedBefore = decimal(balance.quantity_reserved);
  const reservedAfter = input.consumeReserved ? reservedBefore.minus(quantity) : reservedBefore;
  const quantityAfter = quantityBefore.minus(quantity);
  const unitCost = input.unitCost === undefined || input.unitCost === null ? balance.average_cost : input.unitCost;

  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter),
    quantity_reserved: toMoney(reservedAfter)
  });
  const movementId = await writeMovement(connection, {
    ...input,
    itemId: item.id,
    quantityChange: quantity.negated(),
    quantityBefore,
    quantityAfter,
    reservedQuantityChange: reservedAfter.minus(reservedBefore),
    reservedQuantityBefore: reservedBefore,
    reservedQuantityAfter: reservedAfter,
    unitCost
  });
  await notifyLowStockTransition(connection, {
    item,
    balance,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
    quantityBefore,
    quantityAfter,
    reservedBefore,
    reservedAfter
  });
  return resultForBalance(balance, movementId, {
    quantityBefore,
    quantityAfter,
    reservedBefore,
    reservedAfter,
    averageCost: balance.average_cost,
    item_id: item.id
  });
}

async function decreaseItemStock(connection, input) {
  const item = await resolveItem(connection, input);
  const quantity = normalizeQuantity(item, input.quantity, 'quantity', {
    requireLooseUnitMultiple: item.stock_mode === 'carton_weight'
  });
  if (item.stock_mode === 'carton_weight' && !input.skipCartonSelection) {
    const looseUnits = quantity.div(cartonUnitWeight(item));
    return consumeCartonLooseUnits(connection, {
      ...input,
      item,
      itemId: item.id,
      looseUnits,
      quantity,
      movementType: input.movementType || 'stock_adjustment'
    });
  }
  return decreaseStandardItemStock(connection, item, input, quantity);
}

async function reserveItemStock(connection, input) {
  const item = await resolveItem(connection, input);
  const quantity = normalizeQuantity(item, input.quantity, 'quantity', {
    requireLooseUnitMultiple: item.stock_mode === 'carton_weight'
  });
  const balance = await getItemBalanceForUpdate(connection, input.warehouseId, item.id, input.storeId);
  if (availableQuantity(balance).lt(quantity)) {
    throw ApiError.conflict('Insufficient stock available');
  }
  const reservedBefore = decimal(balance.quantity_reserved);
  const reservedAfter = reservedBefore.plus(quantity);
  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_reserved: toMoney(reservedAfter)
  });
  const movementId = await writeMovement(connection, {
    ...input,
    itemId: item.id,
    quantityChange: 0,
    quantityBefore: balance.quantity_on_hand,
    quantityAfter: balance.quantity_on_hand,
    reservedQuantityChange: quantity,
    reservedQuantityBefore: reservedBefore,
    reservedQuantityAfter: reservedAfter,
    unitCost: input.unitCost === undefined ? balance.average_cost : input.unitCost
  });
  await notifyLowStockTransition(connection, {
    item,
    balance,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
    quantityBefore: balance.quantity_on_hand,
    quantityAfter: balance.quantity_on_hand,
    reservedBefore,
    reservedAfter
  });
  return resultForBalance(balance, movementId, {
    reservedBefore,
    reservedAfter,
    item_id: item.id
  });
}

async function releaseReservedItemStock(connection, input) {
  const item = await resolveItem(connection, input);
  const quantity = normalizeQuantity(item, input.quantity, 'quantity', {
    requireLooseUnitMultiple: item.stock_mode === 'carton_weight'
  });
  const balance = await getItemBalanceForUpdate(connection, input.warehouseId, item.id, input.storeId);
  const reservedBefore = decimal(balance.quantity_reserved);
  if (reservedBefore.lt(quantity)) {
    throw ApiError.conflict('Reserved stock cannot be released below zero');
  }
  const reservedAfter = reservedBefore.minus(quantity);
  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_reserved: toMoney(reservedAfter)
  });
  const movementId = await writeMovement(connection, {
    ...input,
    itemId: item.id,
    quantityChange: 0,
    quantityBefore: balance.quantity_on_hand,
    quantityAfter: balance.quantity_on_hand,
    reservedQuantityChange: quantity.negated(),
    reservedQuantityBefore: reservedBefore,
    reservedQuantityAfter: reservedAfter,
    unitCost: input.unitCost === undefined ? balance.average_cost : input.unitCost
  });
  await notifyLowStockTransition(connection, {
    item,
    balance,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
    quantityBefore: balance.quantity_on_hand,
    quantityAfter: balance.quantity_on_hand,
    reservedBefore,
    reservedAfter
  });
  return resultForBalance(balance, movementId, {
    reservedBefore,
    reservedAfter,
    item_id: item.id
  });
}

async function receiveCartonStock(connection, input) {
  const item = await resolveItem(connection, input);
  if (item.stock_mode !== 'carton_weight') {
    throw validationError('item_id', 'Only carton-weight items can be received by carton count');
  }
  assertPositiveQuantity(input.cartonCount, 'carton_count');
  assertWholeNumber(input.cartonCount, 'carton_count');
  const cartonCount = decimal(input.cartonCount);
  const kgPerCarton = decimal(item.kg_per_carton);
  const totalQuantity = cartonCount.mul(kgPerCarton);
  const configuredDefaultCostPerCarton = decimal(item.default_cost || 0).mul(kgPerCarton);
  const costPerCarton = input.costPerCarton === undefined || input.costPerCarton === null
    ? configuredDefaultCostPerCarton
    : decimal(input.costPerCarton);
  const unitCost = costPerCarton.div(kgPerCarton);
  const balance = await getItemBalanceForUpdate(connection, input.warehouseId, item.id, input.storeId);
  const quantityBefore = decimal(balance.quantity_on_hand);
  const quantityAfter = quantityBefore.plus(totalQuantity);
  const averageCost = calculateWeightedAverageCost(balance, totalQuantity, unitCost);

  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter),
    average_cost: toMoney(averageCost)
  });
  const cartonLotId = await inventoryModel.createCartonStockLot(connection, {
    store_id: input.storeId,
    warehouse_id: input.warehouseId,
    item_id: item.id,
    received_cartons: Number(cartonCount.toString()),
    remaining_cartons: Number(cartonCount.toString()),
    kg_per_carton: toMoney(kgPerCarton),
    loose_units_per_carton: Number(decimal(item.loose_units_per_carton).toString()),
    unit_cost_per_kg: toMoney(unitCost),
    source_type: input.referenceType || input.sourceType || 'stock_receipt',
    source_id: input.referenceId || input.sourceId || null,
    received_at: input.receivedAt,
    created_by: input.createdBy
  });
  const movementId = await writeMovement(connection, {
    ...input,
    itemId: item.id,
    movementType: input.movementType || 'purchase_receive',
    quantityChange: totalQuantity,
    quantityBefore,
    quantityAfter,
    reservedQuantityBefore: balance.quantity_reserved,
    reservedQuantityAfter: balance.quantity_reserved,
    unitCost,
    cartonStockLotId: cartonLotId
  });
  await notifyLowStockTransition(connection, {
    item,
    balance,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
    quantityBefore,
    quantityAfter,
    reservedBefore: balance.quantity_reserved,
    reservedAfter: balance.quantity_reserved
  });
  return resultForBalance(balance, movementId, {
    quantityBefore,
    quantityAfter,
    averageCost,
    item_id: item.id,
    carton_lot_id: cartonLotId,
    carton_count: Number(cartonCount.toString()),
    cost_per_carton: toMoney(costPerCarton)
  });
}

async function recordCartonOpen(connection, item, balance, input, lotId, shelfId = null) {
  return writeMovement(connection, {
    ...input,
    itemId: item.id,
    movementType: 'carton_open',
    quantityChange: 0,
    quantityBefore: balance.quantity_on_hand,
    quantityAfter: balance.quantity_on_hand,
    reservedQuantityBefore: balance.quantity_reserved,
    reservedQuantityAfter: balance.quantity_reserved,
    unitCost: balance.average_cost,
    cartonStockLotId: lotId,
    openCartonShelfId: shelfId,
    referenceType: 'carton_stock_lot',
    referenceId: lotId,
    notes: input.notes || 'Opened carton to fulfil loose-unit stock consumption'
  });
}

async function openCartonForReservation(connection, input) {
  const item = await resolveItem(connection, input);
  if (item.stock_mode !== 'carton_weight') {
    throw validationError('item_id', 'Only carton-weight items have cartons to open');
  }
  const balance = input.balance || await getItemBalanceForUpdate(
    connection,
    input.warehouseId,
    item.id,
    input.storeId
  );
  const activeShelf = await inventoryModel.getActiveOpenCartonShelfForUpdate(
    connection,
    input.warehouseId,
    item.id
  );
  if (activeShelf) {
    throw ApiError.conflict('The existing open carton must be used before opening another carton');
  }
  const lot = await inventoryModel.getCartonLotForUpdate(connection, input.cartonLotId);
  if (!lot || Number(lot.warehouse_id) !== Number(input.warehouseId) || Number(lot.item_id) !== Number(item.id)) {
    throw validationError('carton_lot_id', 'Carton lot does not belong to this warehouse item');
  }
  if (decimal(lot.remaining_cartons).lte(0)) {
    throw ApiError.conflict('Selected carton lot has no sealed cartons available');
  }
  if (!input.consumeReserved && decimal(lot.remaining_cartons).minus(decimal(lot.reserved_cartons || 0)).lte(0)) {
    throw ApiError.conflict('Selected carton lot is fully reserved for dispatch');
  }
  await inventoryModel.updateCartonStockLot(connection, lot.id, {
    remaining_cartons: Number(decimal(lot.remaining_cartons).minus(1).toString())
  });
  const shelfId = await inventoryModel.createOpenCartonShelf(connection, {
    store_id: input.storeId,
    warehouse_id: input.warehouseId,
    item_id: item.id,
    carton_lot_id: lot.id,
    initial_loose_units: Number(decimal(lot.loose_units_per_carton).toString()),
    remaining_loose_units: Number(decimal(lot.loose_units_per_carton).toString()),
    loose_unit_weight_kg: toMoney(cartonUnitWeight(item)),
    opened_by: input.createdBy
  });
  await recordCartonOpen(connection, item, balance, input, lot.id, shelfId);
  return {
    open_carton_shelf_id: shelfId,
    carton_lot_id: lot.id,
    initial_loose_units: Number(decimal(lot.loose_units_per_carton).toString()),
    remaining_loose_units: Number(decimal(lot.loose_units_per_carton).toString()),
    loose_unit_weight_kg: toMoney(cartonUnitWeight(item)),
    status: 'open'
  };
}

async function ensureOpenCartonShelf(connection, input) {
  const item = await resolveItem(connection, input);
  const balance = input.balance || await getItemBalanceForUpdate(
    connection,
    input.warehouseId,
    item.id,
    input.storeId
  );
  const activeShelf = await inventoryModel.getActiveOpenCartonShelfForUpdate(
    connection,
    input.warehouseId,
    item.id
  );
  if (activeShelf) return activeShelf;
  let cartonLotId = input.cartonLotId;
  if (!cartonLotId) {
    const lots = await inventoryModel.getAvailableCartonLotsForUpdate(connection, input.warehouseId, item.id);
    cartonLotId = lots[0]?.id;
  }
  if (!cartonLotId) throw ApiError.conflict('Insufficient sealed cartons available to open');
  return openCartonForReservation(connection, {
    ...input,
    item,
    itemId: item.id,
    balance,
    cartonLotId
  });
}

function allocationValue(allocation, snakeCase, camelCase) {
  return allocation[snakeCase] === undefined ? allocation[camelCase] : allocation[snakeCase];
}

async function consumeFromOpenShelf(connection, item, shelf, looseUnits, looseUnitWeight, options = {}) {
  if (!shelf || shelf.status !== 'open') {
    throw ApiError.conflict('Allocated open carton shelf is no longer available');
  }
  const requested = decimal(looseUnits);
  const current = decimal(shelf.remaining_loose_units);
  if (current.lt(requested)) {
    throw ApiError.conflict('Allocated open carton shelf no longer has enough loose units');
  }
  if (!options.consumeReserved && shelf.available_loose_units !== undefined
    && decimal(shelf.available_loose_units).lt(requested)) {
    throw ApiError.conflict('Open carton shelf quantity is reserved for dispatch');
  }
  const next = current.minus(requested);
  // A shelf selected from storage exposes `id`; a shelf opened inside this
  // transaction exposes `open_carton_shelf_id`.  Both represent the same
  // source and must be usable by the shelf-first consumption path.
  const shelfId = shelf.id || shelf.open_carton_shelf_id;
  await inventoryModel.updateOpenCartonShelf(connection, shelfId, {
    remaining_loose_units: Number(next.toString()),
    ...(next.eq(0) ? { status: 'closed', closed_at: 'CURRENT_TIMESTAMP' } : {})
  });
  return {
    open_carton_shelf_id: shelfId,
    carton_lot_id: shelf.carton_lot_id,
    loose_units: Number(requested.toString()),
    quantity_kg: toMoney(requested.mul(looseUnitWeight))
  };
}

async function consumeCartonLooseUnits(connection, input) {
  const item = await resolveItem(connection, input);
  if (item.stock_mode !== 'carton_weight') {
    throw validationError('item_id', 'Only carton-weight items have loose carton units');
  }
  assertPositiveQuantity(input.looseUnits, 'loose_units');
  assertWholeNumber(input.looseUnits, 'loose_units');
  const looseUnits = decimal(input.looseUnits);
  const looseUnitWeight = cartonUnitWeight(item);
  const quantity = looseUnits.mul(looseUnitWeight);
  const balance = await getItemBalanceForUpdate(connection, input.warehouseId, item.id, input.storeId);
  assertBalanceCanConsume(balance, quantity, input);
  const quantityBefore = decimal(balance.quantity_on_hand);
  const reservedBefore = decimal(balance.quantity_reserved);
  const reservedAfter = input.consumeReserved ? reservedBefore.minus(quantity) : reservedBefore;
  const allocations = [];
  const sourceAllocations = Array.isArray(input.sourceAllocations) && input.sourceAllocations.length
    ? input.sourceAllocations
    : null;

  if (sourceAllocations) {
    const allocatedUnits = sourceAllocations.reduce((total, allocation) => total.plus(decimal(
      allocationValue(allocation, 'loose_units', 'looseUnits') || 0
    )), decimal(0));
    if (!allocatedUnits.eq(looseUnits)) {
      throw validationError('source_allocations', 'Allocated loose units must exactly match the requested quantity');
    }
    for (const allocation of sourceAllocations) {
      const allocated = decimal(allocationValue(allocation, 'loose_units', 'looseUnits'));
      if (allocated.lte(0) || !allocated.isInteger()) {
        throw validationError('source_allocations', 'Each loose allocation must be a positive whole number');
      }
      const shelfId = allocationValue(allocation, 'open_carton_shelf_id', 'openCartonShelfId');
      const lotId = allocationValue(allocation, 'carton_lot_id', 'cartonLotId');
      let shelf;
      if (shelfId) {
        shelf = await inventoryModel.getOpenCartonShelfForUpdate(connection, shelfId);
        if (!shelf || Number(shelf.warehouse_id) !== Number(input.warehouseId) || Number(shelf.item_id) !== Number(item.id)) {
          throw validationError('source_allocations', 'Allocated open carton shelf does not belong to this item stock');
        }
      } else if (lotId) {
        shelf = await openCartonForReservation(connection, {
          ...input,
          item,
          itemId: item.id,
          balance,
          cartonLotId: lotId
        });
      } else {
        throw validationError('source_allocations', 'Each loose allocation requires an open shelf or carton lot');
      }
      allocations.push(await consumeFromOpenShelf(connection, item, shelf, allocated, looseUnitWeight, {
        consumeReserved: input.consumeReserved
      }));
    }
  } else {
    let remaining = looseUnits;
    while (remaining.gt(0)) {
      const shelf = await ensureOpenCartonShelf(connection, {
        ...input,
        item,
        itemId: item.id,
        balance
      });
      const availableShelfUnits = shelf.available_loose_units === undefined
        ? decimal(shelf.remaining_loose_units)
        : decimal(shelf.available_loose_units);
      if (availableShelfUnits.lte(0)) {
        throw ApiError.conflict('The active open carton is fully reserved for dispatch');
      }
      const consumed = DecimalMin(remaining, availableShelfUnits);
      allocations.push(await consumeFromOpenShelf(connection, item, shelf, consumed, looseUnitWeight));
      remaining = remaining.minus(consumed);
    }
  }

  const quantityAfter = quantityBefore.minus(quantity);
  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter),
    quantity_reserved: toMoney(reservedAfter)
  });
  const movementId = await writeMovement(connection, {
    ...input,
    itemId: item.id,
    movementType: input.movementType || 'stock_adjustment',
    quantityChange: quantity.negated(),
    quantityBefore,
    quantityAfter,
    reservedQuantityChange: reservedAfter.minus(reservedBefore),
    reservedQuantityBefore: reservedBefore,
    reservedQuantityAfter: reservedAfter,
    unitCost: input.unitCost === undefined || input.unitCost === null ? balance.average_cost : input.unitCost,
    openCartonShelfId: allocations.length === 1 ? allocations[0].open_carton_shelf_id : null,
    cartonStockLotId: allocations.length === 1 ? allocations[0].carton_lot_id : null
  });
  await notifyLowStockTransition(connection, {
    item,
    balance,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
    quantityBefore,
    quantityAfter,
    reservedBefore,
    reservedAfter
  });
  return resultForBalance(balance, movementId, {
    quantityBefore,
    quantityAfter,
    reservedBefore,
    reservedAfter,
    item_id: item.id,
    loose_units_consumed: Number(looseUnits.toString()),
    carton_allocations: allocations
  });
}

function DecimalMin(left, right) {
  return decimal(left).lte(decimal(right)) ? decimal(left) : decimal(right);
}

async function consumeSealedCartons(connection, input) {
  const item = await resolveItem(connection, input);
  if (item.stock_mode !== 'carton_weight') {
    throw validationError('item_id', 'Only carton-weight items have sealed cartons');
  }
  assertPositiveQuantity(input.cartonCount, 'carton_count');
  assertWholeNumber(input.cartonCount, 'carton_count');
  const cartonCount = decimal(input.cartonCount);
  const quantity = cartonCount.mul(decimal(item.kg_per_carton));
  const balance = await getItemBalanceForUpdate(connection, input.warehouseId, item.id, input.storeId);
  assertBalanceCanConsume(balance, quantity, input);
  const allocations = [];
  const sourceAllocations = Array.isArray(input.sourceAllocations) && input.sourceAllocations.length
    ? input.sourceAllocations
    : null;
  if (sourceAllocations) {
    const allocatedCartons = sourceAllocations.reduce((total, allocation) => total.plus(decimal(
      allocationValue(allocation, 'carton_count', 'cartonCount') || 0
    )), decimal(0));
    if (!allocatedCartons.eq(cartonCount)) {
      throw validationError('source_allocations', 'Allocated cartons must exactly match the requested carton count');
    }
    for (const allocation of sourceAllocations) {
      const lotId = allocationValue(allocation, 'carton_lot_id', 'cartonLotId');
      const allocated = decimal(allocationValue(allocation, 'carton_count', 'cartonCount'));
      if (!lotId || allocated.lte(0) || !allocated.isInteger()) {
        throw validationError('source_allocations', 'Each carton allocation requires a lot and whole carton count');
      }
      const lot = await inventoryModel.getCartonLotForUpdate(connection, lotId);
      if (!lot || Number(lot.warehouse_id) !== Number(input.warehouseId) || Number(lot.item_id) !== Number(item.id)) {
        throw validationError('source_allocations', 'Allocated carton lot does not belong to this item stock');
      }
      const availableCartons = input.consumeReserved
        ? decimal(lot.remaining_cartons)
        : decimal(lot.remaining_cartons).minus(decimal(lot.reserved_cartons || 0));
      if (availableCartons.lt(allocated)) {
        throw ApiError.conflict('Allocated carton lot no longer has enough sealed cartons');
      }
      await inventoryModel.updateCartonStockLot(connection, lot.id, {
        remaining_cartons: Number(decimal(lot.remaining_cartons).minus(allocated).toString())
      });
      allocations.push({ carton_lot_id: lot.id, carton_count: Number(allocated.toString()) });
    }
  } else {
    const lots = await inventoryModel.getAvailableCartonLotsForUpdate(connection, input.warehouseId, item.id);
    const totalSealed = lots.reduce((total, lot) => total.plus(decimal(
      lot.available_cartons === undefined ? lot.remaining_cartons : lot.available_cartons
    )), decimal(0));
    if (totalSealed.lt(cartonCount)) {
      throw ApiError.conflict('Insufficient sealed cartons available');
    }
    let remaining = cartonCount;
    for (const lot of lots) {
      if (remaining.eq(0)) break;
      const fromLot = DecimalMin(remaining, decimal(
        lot.available_cartons === undefined ? lot.remaining_cartons : lot.available_cartons
      ));
      const remainingCartons = decimal(lot.remaining_cartons).minus(fromLot);
      await inventoryModel.updateCartonStockLot(connection, lot.id, {
        remaining_cartons: Number(remainingCartons.toString())
      });
      allocations.push({ carton_lot_id: lot.id, carton_count: Number(fromLot.toString()) });
      remaining = remaining.minus(fromLot);
    }
  }
  const quantityBefore = decimal(balance.quantity_on_hand);
  const reservedBefore = decimal(balance.quantity_reserved);
  const reservedAfter = input.consumeReserved ? reservedBefore.minus(quantity) : reservedBefore;
  const quantityAfter = quantityBefore.minus(quantity);
  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter),
    quantity_reserved: toMoney(reservedAfter)
  });
  const movementId = await writeMovement(connection, {
    ...input,
    itemId: item.id,
    movementType: input.movementType || 'stock_adjustment',
    quantityChange: quantity.negated(),
    quantityBefore,
    quantityAfter,
    reservedQuantityChange: reservedAfter.minus(reservedBefore),
    reservedQuantityBefore: reservedBefore,
    reservedQuantityAfter: reservedAfter,
    unitCost: input.unitCost === undefined || input.unitCost === null ? balance.average_cost : input.unitCost,
    cartonStockLotId: allocations.length === 1 ? allocations[0].carton_lot_id : null
  });
  await notifyLowStockTransition(connection, {
    item,
    balance,
    storeId: input.storeId,
    warehouseId: input.warehouseId,
    quantityBefore,
    quantityAfter,
    reservedBefore,
    reservedAfter
  });
  return resultForBalance(balance, movementId, {
    quantityBefore,
    quantityAfter,
    reservedBefore,
    reservedAfter,
    item_id: item.id,
    sealed_cartons_consumed: Number(cartonCount.toString()),
    carton_allocations: allocations
  });
}

async function adjustItemStock(connection, input) {
  const item = await resolveItem(connection, input);
  if (item.stock_mode === 'carton_weight') {
    if (input.cartonCountChange !== undefined) {
      const cartonCount = decimal(input.cartonCountChange);
      if (cartonCount.eq(0)) throw validationError('carton_count_change', 'Quantity change cannot be zero');
      if (!cartonCount.isInteger()) throw validationError('carton_count_change', 'Carton count must be a whole number');
      if (cartonCount.gt(0)) {
        return receiveCartonStock(connection, {
          ...input,
          item,
          itemId: item.id,
          cartonCount,
          costPerCarton: input.costPerCarton,
          movementType: 'stock_adjustment',
          referenceType: input.referenceType || 'stock_adjustment'
        });
      }
      return consumeSealedCartons(connection, {
        ...input,
        item,
        itemId: item.id,
        cartonCount: cartonCount.abs(),
        movementType: 'stock_adjustment',
        referenceType: input.referenceType || 'stock_adjustment'
      });
    }
    if (input.looseUnitsChange !== undefined) {
      const looseUnits = decimal(input.looseUnitsChange);
      if (looseUnits.gte(0)) {
        throw validationError('loose_units_change', 'Loose-unit adjustments must remove stock; receive sealed cartons instead');
      }
      return consumeCartonLooseUnits(connection, {
        ...input,
        item,
        itemId: item.id,
        looseUnits: looseUnits.abs(),
        movementType: 'stock_adjustment',
        referenceType: input.referenceType || 'stock_adjustment'
      });
    }
    throw validationError('carton_count_change', 'Carton-weight adjustments require carton count or loose-unit change');
  }

  if (input.quantityChange === undefined || decimal(input.quantityChange).eq(0)) {
    throw validationError('quantity_change', 'Quantity change cannot be zero');
  }
  const quantityChange = decimal(input.quantityChange);
  if (quantityChange.gt(0)) {
    return increaseItemStock(connection, {
      ...input,
      item,
      itemId: item.id,
      quantity: quantityChange,
      movementType: 'stock_adjustment',
      referenceType: input.referenceType || 'stock_adjustment'
    });
  }
  return decreaseItemStock(connection, {
    ...input,
    item,
    itemId: item.id,
    quantity: quantityChange.abs(),
    movementType: 'stock_adjustment',
    referenceType: input.referenceType || 'stock_adjustment'
  });
}

// Aliases intentionally preserve a small migration bridge for callers that now pass itemId.
// They reject legacy variant-only inputs rather than silently applying inventory to a variant.
async function increaseStock(connection, input) {
  if (!input.itemId) throw validationError('item_id', 'Canonical item_id is required');
  return increaseItemStock(connection, input);
}

async function decreaseStock(connection, input) {
  if (!input.itemId) throw validationError('item_id', 'Canonical item_id is required');
  return decreaseItemStock(connection, input);
}

async function reserveStock(connection, input) {
  if (!input.itemId) throw validationError('item_id', 'Canonical item_id is required');
  return reserveItemStock(connection, input);
}

async function releaseReservedStock(connection, input) {
  if (!input.itemId) throw validationError('item_id', 'Canonical item_id is required');
  return releaseReservedItemStock(connection, input);
}

module.exports = {
  adjustItemStock,
  assertCanonicalItem,
  calculateWeightedAverageCost,
  cartonUnitWeight,
  consumeCartonLooseUnits,
  consumeSealedCartons,
  decreaseItemStock,
  decreaseStock,
  ensureOpenCartonShelf,
  getItemBalanceForUpdate,
  increaseItemStock,
  increaseStock,
  normalizeQuantity,
  openCartonForReservation,
  receiveCartonStock,
  releaseReservedItemStock,
  releaseReservedStock,
  reserveItemStock,
  reserveStock
};
