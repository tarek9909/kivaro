const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const { writeAuditLog } = require('../../middleware/audit.middleware');
const accountingModel = require('../accounting/accounting.model');
const inventoryModel = require('../inventory/inventory.model');
const stockService = require('../inventory/stock.service');
const purchaseModel = require('./purchases.model');

async function getSupplier(id, actor = {}) {
  const supplier = await purchaseModel.findSupplierById(id);

  return assertRowInScope(supplier, actor, 'Supplier not found');
}

function assertActive(row, field, label) {
  if (row?.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      { field, message: `${label} must be active` }
    ]);
  }

  return row;
}

function validationError(field, message) {
  return ApiError.badRequest('Validation failed', [{ field, message }]);
}

function assertCanonicalInventoryItem(item, field = 'items.item_id') {
  if (!item || !['normal', 'packaging'].includes(item.item_kind)) {
    throw ApiError.badRequest('Validation failed', [
      { field, message: 'Item is not configured for canonical inventory' }
    ]);
  }
  if (!['carton_weight', 'weight', 'piece'].includes(item.stock_mode)) {
    throw validationError(field, 'Item stock mode is invalid');
  }
  if (item.item_kind === 'packaging' && item.stock_mode !== 'piece') {
    throw validationError(field, 'Packaging items must use piece stock mode');
  }

  return item;
}

function numericInput(value, field, { whole = false } = {}) {
  if (value === undefined || value === null || value === '') {
    throw validationError(field, 'Quantity is required');
  }
  const normalized = decimal(value);
  if (normalized.lte(0)) {
    throw validationError(field, 'Quantity must be greater than zero');
  }
  if (whole && !normalized.isInteger()) {
    throw validationError(field, 'Quantity must be a whole number');
  }
  return normalized;
}

function valueFromAliases(input, primaryField, legacyField, field) {
  const primary = input[primaryField];
  const legacy = input[legacyField];
  if (primary !== undefined && legacy !== undefined && !decimal(primary).eq(legacy)) {
    throw validationError(field, `${primaryField} and ${legacyField} must match when both are supplied`);
  }
  return primary === undefined ? legacy : primary;
}

function costInput(value, field) {
  if (value === undefined || value === null) return undefined;
  const cost = decimal(value);
  if (cost.lt(0)) throw validationError(field, 'Cost cannot be negative');
  return cost;
}

function normalizeItemQuantity(item, quantity, field) {
  const value = numericInput(quantity, field, { whole: item?.stock_mode === 'piece' });
  if (item?.stock_mode === 'carton_weight') {
    throw validationError(field, 'Carton-weight items use carton count, not loose kg quantity');
  }

  if (item?.stock_mode === 'weight') {
    return value.mul(item.base_unit_conversion_to_base || 1);
  }

  return value;
}

function normalizeItemUnitCost(item, unitCost) {
  if (unitCost === null || unitCost === undefined) {
    return unitCost;
  }

  if (item?.stock_mode === 'weight') {
    return decimal(unitCost).div(item.base_unit_conversion_to_base || 1);
  }

  return decimal(unitCost);
}

function orderLineValues(item, line, index) {
  if (item.stock_mode === 'carton_weight') {
    const cartonCount = numericInput(
      valueFromAliases(line, 'carton_count', 'ordered_quantity', `items.${index}.carton_count`),
      `items.${index}.carton_count`,
      { whole: true }
    );
    const costPerCarton = costInput(
      valueFromAliases(line, 'cost_per_carton', 'unit_cost', `items.${index}.cost_per_carton`),
      `items.${index}.cost_per_carton`
    );
    if (costPerCarton === undefined) {
      throw validationError(`items.${index}.cost_per_carton`, 'Cost per carton is required');
    }
    return {
      ordered_quantity: toMoney(cartonCount),
      unit_cost: toMoney(costPerCarton),
      carton_count: toMoney(cartonCount),
      cost_per_carton: toMoney(costPerCarton)
    };
  }

  if (line.carton_count !== undefined || line.cost_per_carton !== undefined) {
    throw validationError(`items.${index}`, 'Carton fields are only valid for carton-weight items');
  }
  const quantity = numericInput(
    valueFromAliases(line, 'quantity', 'ordered_quantity', `items.${index}.quantity`),
    `items.${index}.quantity`,
    { whole: item.stock_mode === 'piece' }
  );
  const unitCost = costInput(line.unit_cost, `items.${index}.unit_cost`);
  if (unitCost === undefined) {
    throw validationError(`items.${index}.unit_cost`, 'Unit cost is required');
  }
  return {
    ordered_quantity: toMoney(quantity),
    unit_cost: toMoney(unitCost),
    quantity: toMoney(quantity)
  };
}

function receiptLineValues(item, poItem, line, index) {
  if (item.stock_mode === 'carton_weight') {
    const cartonCount = numericInput(
      valueFromAliases(line, 'carton_count', 'received_quantity', `items.${index}.carton_count`),
      `items.${index}.carton_count`,
      { whole: true }
    );
    const costPerCarton = costInput(
      valueFromAliases(line, 'cost_per_carton', 'unit_cost', `items.${index}.cost_per_carton`),
      `items.${index}.cost_per_carton`
    ) ?? decimal(poItem.unit_cost);
    return {
      stored_quantity: toMoney(cartonCount),
      stored_unit_cost: toMoney(costPerCarton),
      carton_count: cartonCount,
      cost_per_carton: costPerCarton
    };
  }

  if (line.carton_count !== undefined || line.cost_per_carton !== undefined) {
    throw validationError(`items.${index}`, 'Carton fields are only valid for carton-weight items');
  }
  const entryQuantity = numericInput(
    valueFromAliases(line, 'quantity', 'received_quantity', `items.${index}.quantity`),
    `items.${index}.quantity`,
    { whole: item.stock_mode === 'piece' }
  );
  const unitCost = costInput(line.unit_cost, `items.${index}.unit_cost`) ?? decimal(poItem.unit_cost);
  return {
    stored_quantity: toMoney(entryQuantity),
    stored_unit_cost: toMoney(unitCost),
    quantity: normalizeItemQuantity(item, entryQuantity, `items.${index}.quantity`),
    unit_cost: normalizeItemUnitCost(item, unitCost)
  };
}

async function resolvePurchaseOrderItems(items, storeId) {
  const resolvedItems = [];

  for (const [index, item] of items.entries()) {
    const field = 'items.item_id';
    const stockItem = await inventoryModel.findItemById(item.item_id);

    if (!stockItem) {
      throw ApiError.badRequest('Validation failed', [
        {
          field,
          message: `Item ${item.item_id} does not exist`
        }
      ]);
    }

    assertSameStore(stockItem, storeId, field, `Item ${item.item_id} does not belong to this store`);
    assertActive(stockItem, field, `Item ${item.item_id}`);
    assertCanonicalInventoryItem(stockItem, field);
    const values = orderLineValues(stockItem, item, index);
    resolvedItems.push({
      ...item,
      item_id: stockItem.id,
      ...values
    });
  }

  return resolvedItems;
}

async function createSupplier(data, userId, actor = {}) {
  return purchaseModel.createSupplier({
    ...scopedData(data, actor),
    created_by: userId
  });
}

async function updateSupplier(id, data, actor = {}) {
  await getSupplier(id, actor);
  const { store_id, ...updates } = data;
  return purchaseModel.updateSupplier(id, updates);
}

async function deleteSupplier(id, actor = {}) {
  await getSupplier(id, actor);
  await purchaseModel.deactivateSupplier(id);
}

function calculateOrderTotals(items, discountAmount = 0, taxAmount = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(decimal(item.ordered_quantity).mul(item.unit_cost)),
    decimal(0)
  );
  const total = subtotal.minus(discountAmount || 0).plus(taxAmount || 0);

  if (total.lt(0)) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'total_amount',
        message: 'Total amount cannot be negative'
      }
    ]);
  }

  return {
    subtotal: toMoney(subtotal),
    total_amount: toMoney(total)
  };
}

async function getPurchaseOrder(id, actor = {}) {
  const purchaseOrder = await purchaseModel.findPurchaseOrderById(id);

  assertRowInScope(purchaseOrder, actor, 'Purchase order not found');

  const [items, receipts, receivedValue] = await Promise.all([
    purchaseModel.getPurchaseOrderItems(id),
    purchaseModel.getPurchaseOrderReceipts(id),
    purchaseModel.getPurchaseOrderReceivedValue(id)
  ]);
  const payableAmount = purchaseOrder.status === 'closed'
    ? decimal(receivedValue)
    : decimal(purchaseOrder.total_amount || 0);
  const outstandingAmount = payableAmount.minus(purchaseOrder.amount_paid || 0);

  return {
    ...purchaseOrder,
    received_value: toMoney(receivedValue),
    payable_amount: toMoney(payableAmount),
    outstanding_amount: toMoney(outstandingAmount.lt(0) ? 0 : outstandingAmount),
    items,
    receipts
  };
}

async function listPurchaseOrderReceipts(id, actor = {}) {
  await getPurchaseOrder(id, actor);
  return purchaseModel.getPurchaseOrderReceipts(id);
}

async function createPurchaseOrder(data, userId, audit = {}, actor = {}) {
  const scoped = scopedData(data, actor);
  if (!scoped.supplier_id) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'supplier_id', message: 'Supplier is required for automatic supplier payment' }
    ]);
  }
  assertActive(await getSupplier(scoped.supplier_id, actor), 'supplier_id', 'Supplier');

  const warehouse = await inventoryModel.findWarehouseById(scoped.warehouse_id);

  if (!warehouse) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'warehouse_id',
        message: 'Warehouse does not exist'
      }
    ]);
  }
  assertSameStore(warehouse, scoped.store_id, 'warehouse_id', 'Warehouse does not belong to this store');
  assertActive(warehouse, 'warehouse_id', 'Warehouse');

  const cashAccount = await accountingModel.findCashAccountById(scoped.cash_account_id);
  if (!cashAccount) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'Cash account not found' }
    ]);
  }
  assertSameStore(cashAccount, scoped.store_id, 'cash_account_id', 'Cash account does not belong to this store');
  assertActive(cashAccount, 'cash_account_id', 'Cash account');

  const resolvedItems = await resolvePurchaseOrderItems(scoped.items, scoped.store_id);

  const totals = calculateOrderTotals(
    resolvedItems,
    scoped.discount_amount,
    scoped.tax_amount
  );
  const poNumber = data.po_number || createDocumentNumber('PO');

  const purchaseOrderId = await withTransaction(async (connection) => {
    const id = await purchaseModel.createPurchaseOrder(connection, {
      ...data,
      store_id: scoped.store_id,
      supplier_id: scoped.supplier_id,
      cash_account_id: scoped.cash_account_id,
      payment_method: scoped.payment_method || 'cash',
      po_number: poNumber,
      subtotal: totals.subtotal,
      total_amount: totals.total_amount,
      discount_amount: scoped.discount_amount || 0,
      tax_amount: scoped.tax_amount || 0,
      created_by: userId
    });

    for (const item of resolvedItems) {
      await purchaseModel.createPurchaseOrderItem(connection, {
        purchase_order_id: id,
        item_id: item.item_id,
        ordered_quantity: item.ordered_quantity,
        unit_cost: item.unit_cost,
        line_total: toMoney(decimal(item.ordered_quantity).mul(item.unit_cost)),
        notes: item.notes
      });
    }

    await writeAuditLog(connection, {
      userId,
      module: 'purchases',
      action: 'create_purchase_order',
      tableName: 'purchase_orders',
      recordId: id,
      storeId: scoped.store_id,
      newValues: { po_number: poNumber, total_amount: totals.total_amount },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent
    });

    return id;
  });

  return getPurchaseOrder(purchaseOrderId, actor);
}

async function updatePurchaseOrder(id, data, actor = {}) {
  const purchaseOrder = await getPurchaseOrder(id, actor);

  if (!['draft', 'pending'].includes(purchaseOrder.status)) {
    throw ApiError.conflict('Only draft or pending purchase orders can be edited');
  }

  if (data.supplier_id) {
    const supplier = assertActive(await getSupplier(data.supplier_id, actor), 'supplier_id', 'Supplier');
    assertSameStore(supplier, purchaseOrder.store_id, 'supplier_id', 'Supplier does not belong to this store');
  }

  if (data.cash_account_id) {
    const cashAccount = await accountingModel.findCashAccountById(data.cash_account_id);
    if (!cashAccount) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'cash_account_id', message: 'Cash account not found' }
      ]);
    }
    assertSameStore(cashAccount, purchaseOrder.store_id, 'cash_account_id', 'Cash account does not belong to this store');
    assertActive(cashAccount, 'cash_account_id', 'Cash account');
  }

  const { store_id, warehouse_id, ...updates } = data;
  return purchaseModel.updatePurchaseOrder(id, updates);
}

async function submitPurchaseOrder(id, actor = {}) {
  const purchaseOrder = await getPurchaseOrder(id, actor);

  if (purchaseOrder.status !== 'draft') {
    throw ApiError.conflict('Only draft purchase orders can be submitted');
  }

  await purchaseModel.updatePurchaseOrder(id, { status: 'pending' });
  return getPurchaseOrder(id, actor);
}

async function approvePurchaseOrder(id, userId, actor = {}) {
  const purchaseOrder = await getPurchaseOrder(id, actor);
  if (!['draft', 'pending'].includes(purchaseOrder.status)) {
    throw ApiError.conflict('Only draft or pending purchase orders can be approved');
  }
  if (purchaseOrder.approved_at) {
    throw ApiError.conflict('Purchase order is already approved');
  }
  if (!purchaseOrder.supplier_id) {
    throw ApiError.conflict('Purchase order must have a supplier before automatic payment can be recorded');
  }
  if (!purchaseOrder.cash_account_id) {
    throw ApiError.conflict('Purchase order must have a cash account before automatic payment can be recorded');
  }

  const cashAccount = await accountingModel.findCashAccountById(purchaseOrder.cash_account_id);
  if (!cashAccount) {
    throw ApiError.conflict('Purchase order cash account no longer exists');
  }
  assertSameStore(cashAccount, purchaseOrder.store_id, 'cash_account_id', 'Cash account does not belong to this store');
  assertActive(cashAccount, 'cash_account_id', 'Cash account');

  await withTransaction(async (connection) => {
    const lockedPurchaseOrder = await purchaseModel.lockPurchaseOrder(connection, id);
    assertRowInScope(lockedPurchaseOrder, actor, 'Purchase order not found');
    if (!['draft', 'pending'].includes(lockedPurchaseOrder.status)) {
      throw ApiError.conflict('Only draft or pending purchase orders can be approved');
    }
    if (lockedPurchaseOrder.approved_at) {
      throw ApiError.conflict('Purchase order is already approved');
    }

    await purchaseModel.approvePurchaseOrder(connection, id, userId);
    const amount = decimal(lockedPurchaseOrder.total_amount || 0).minus(lockedPurchaseOrder.amount_paid || 0);
    if (amount.gt(0)) {
      const paymentId = await purchaseModel.createSupplierPaymentRecord(connection, {
        store_id: lockedPurchaseOrder.store_id,
        supplier_id: lockedPurchaseOrder.supplier_id,
        purchase_order_id: lockedPurchaseOrder.id,
        payment_date: new Date().toISOString().slice(0, 10),
        amount: toMoney(amount),
        payment_method: lockedPurchaseOrder.payment_method || 'cash',
        reference_number: lockedPurchaseOrder.po_number,
        cash_account_id: lockedPurchaseOrder.cash_account_id,
        notes: `Auto payment for approved purchase order ${lockedPurchaseOrder.po_number}`,
        created_by: userId
      });
      await purchaseModel.incrementPurchaseOrderPaid(connection, lockedPurchaseOrder.id, toMoney(amount));
      await accountingModel.createFinancialTransaction(connection, {
        store_id: lockedPurchaseOrder.store_id,
        cash_account_id: lockedPurchaseOrder.cash_account_id,
        transaction_type: 'supplier_payment',
        direction: 'out',
        amount: toMoney(amount),
        reference_type: 'supplier_payment',
        reference_id: paymentId,
        description: `Auto payment for approved purchase order ${lockedPurchaseOrder.po_number}`,
        created_by: userId
      });
    }
  });
  return getPurchaseOrder(id, actor);
}

async function cancelPurchaseOrder(id, actor = {}) {
  const purchaseOrder = await getPurchaseOrder(id, actor);

  if (['received', 'closed', 'cancelled'].includes(purchaseOrder.status)) {
    throw ApiError.conflict('Received, closed, or cancelled purchase orders cannot be cancelled');
  }

  if (purchaseOrder.status === 'partially_received') {
    await purchaseModel.updatePurchaseOrder(id, { status: 'closed' });
    return getPurchaseOrder(id, actor);
  }

  const hasReceipts = purchaseOrder.receipts.length > 0 ||
    purchaseOrder.items.some((item) => decimal(item.received_quantity).gt(0));
  const hasPayments = decimal(purchaseOrder.amount_paid || 0).gt(0);

  if (hasReceipts || hasPayments) {
    throw ApiError.conflict('Purchase orders with receipts or payments cannot be cancelled');
  }

  await purchaseModel.updatePurchaseOrder(id, { status: 'cancelled' });
  return getPurchaseOrder(id, actor);
}

function getNextStatus(items) {
  const hasReceived = items.some((item) => decimal(item.received_quantity || 0).gt(0));
  if (!hasReceived) return 'approved';
  return items.every((item) => decimal(item.received_quantity || 0).eq(item.ordered_quantity))
    ? 'received'
    : 'partially_received';
}

async function receivePurchaseOrder(id, data, userId, audit = {}, actor = {}) {
  const scopedOrder = await getPurchaseOrder(id, actor);
  const receiptId = await withTransaction(async (connection) => {
    const purchaseOrder = await purchaseModel.lockPurchaseOrder(connection, id);

    if (!purchaseOrder) {
      throw ApiError.notFound('Purchase order not found');
    }

    if (!['approved', 'partially_received'].includes(purchaseOrder.status)) {
      throw ApiError.conflict('Only approved or partially received purchase orders can be received');
    }

    const poItems = await purchaseModel.lockPurchaseOrderItems(connection, id);
    const poItemById = new Map(poItems.map((item) => [Number(item.id), item]));
    const receiptNumber = data.receipt_number || createDocumentNumber('PR');
    const newReceiptId = await purchaseModel.createReceipt(connection, {
      store_id: scopedOrder.store_id,
      purchase_order_id: id,
      receipt_number: receiptNumber,
      received_date: data.received_date,
      notes: data.notes,
      received_by: userId
    });

    for (const [index, item] of data.items.entries()) {
      const poItem = poItemById.get(Number(item.purchase_order_item_id));

      if (!poItem) {
        throw ApiError.badRequest('Validation failed', [
          {
            field: 'items.purchase_order_item_id',
            message: `Purchase order item ${item.purchase_order_item_id} does not belong to this order`
          }
        ]);
      }

      const stockItem = assertCanonicalInventoryItem(
        await inventoryModel.findItemById(poItem.item_id),
        'items.item_id'
      );
      assertSameStore(stockItem, scopedOrder.store_id, 'items.item_id', 'Item does not belong to this store');
      assertActive(stockItem, 'items.item_id', 'Item');
      const values = receiptLineValues(stockItem, poItem, item, index);
      const remainingQuantity = decimal(poItem.ordered_quantity).minus(poItem.received_quantity);
      if (decimal(values.stored_quantity).gt(remainingQuantity)) {
        throw ApiError.conflict('Cannot receive more than ordered quantity');
      }

      await purchaseModel.createReceiptItem(connection, {
        purchase_receipt_id: newReceiptId,
        purchase_order_item_id: poItem.id,
        item_id: poItem.item_id,
        received_quantity: values.stored_quantity,
        unit_cost: values.stored_unit_cost
      });
      await purchaseModel.incrementReceivedQuantity(
        connection,
        poItem.id,
        values.stored_quantity
      );
      poItem.received_quantity = toMoney(decimal(poItem.received_quantity).plus(values.stored_quantity));

      if (stockItem.stock_mode === 'carton_weight') {
        await stockService.receiveCartonStock(connection, {
          storeId: scopedOrder.store_id,
          warehouseId: purchaseOrder.warehouse_id,
          itemId: poItem.item_id,
          item: stockItem,
          cartonCount: values.carton_count,
          costPerCarton: values.cost_per_carton,
          movementType: 'purchase_receive',
          referenceType: 'purchase_receipt',
          referenceId: newReceiptId,
          notes: data.notes,
          createdBy: userId
        });
      } else {
        await stockService.increaseItemStock(connection, {
          storeId: scopedOrder.store_id,
          warehouseId: purchaseOrder.warehouse_id,
          itemId: poItem.item_id,
          item: stockItem,
          quantity: values.quantity,
          unitCost: values.unit_cost,
          movementType: 'purchase_receive',
          referenceType: 'purchase_receipt',
          referenceId: newReceiptId,
          notes: data.notes,
          createdBy: userId
        });
      }
    }

    await purchaseModel.setPurchaseOrderStatus(connection, id, getNextStatus(poItems));
    await writeAuditLog(connection, {
      userId,
      module: 'purchases',
      action: 'receive_purchase_order',
      tableName: 'purchase_receipts',
      recordId: newReceiptId,
      storeId: scopedOrder.store_id,
      newValues: { purchase_order_id: id, receipt_number: receiptNumber },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent
    });

    return newReceiptId;
  });

  return purchaseModel.getReceiptById(receiptId);
}

async function createSupplierPayment(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  let supplier = null;
  let purchaseOrder = null;
  if (scoped.supplier_id) {
    supplier = await getSupplier(scoped.supplier_id, actor);
  }

  if (scoped.purchase_order_id) {
    purchaseOrder = await getPurchaseOrder(scoped.purchase_order_id, actor);
    if (Number(purchaseOrder.supplier_id) !== Number(scoped.supplier_id)) {
      throw ApiError.conflict('Supplier payment must match the purchase order supplier');
    }
  }

  if (!scoped.cash_account_id) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'cash_account_id',
        message: 'Cash account is required'
      }
    ]);
  }

  const cashAccount = await accountingModel.findCashAccountById(scoped.cash_account_id);
  if (!cashAccount) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'cash_account_id',
        message: 'Cash account not found'
      }
    ]);
  }
  assertSameStore(cashAccount, scoped.store_id, 'cash_account_id', 'Cash account does not belong to this store');
  if (cashAccount.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'cash_account_id',
        message: 'Cash account must be active'
      }
    ]);
  }

  let paymentId;
  await withTransaction(async (connection) => {
    if (scoped.purchase_order_id) {
      const lockedPurchaseOrder = await purchaseModel.lockPurchaseOrder(connection, scoped.purchase_order_id);
      assertRowInScope(lockedPurchaseOrder, actor, 'Purchase order not found');
      if (Number(lockedPurchaseOrder.supplier_id) !== Number(scoped.supplier_id)) {
        throw ApiError.conflict('Supplier payment must match the purchase order supplier');
      }
      if (!['approved', 'partially_received', 'received', 'closed'].includes(lockedPurchaseOrder.status)) {
        throw ApiError.conflict('Supplier payments can only be posted against approved, received, or closed purchase orders');
      }
      const payableAmount = lockedPurchaseOrder.status === 'closed'
        ? decimal(await purchaseModel.getPurchaseOrderReceivedValue(scoped.purchase_order_id, connection))
        : decimal(lockedPurchaseOrder.total_amount);
      const unpaidAmount = payableAmount.minus(lockedPurchaseOrder.amount_paid || 0);
      if (decimal(scoped.amount).gt(unpaidAmount)) {
        throw ApiError.conflict('Supplier payment amount cannot exceed the unpaid purchase order balance');
      }
    }

    paymentId = await purchaseModel.createSupplierPaymentRecord(connection, {
      ...data,
      store_id: scoped.store_id,
      cash_account_id: scoped.cash_account_id,
      created_by: userId
    });
    await purchaseModel.incrementPurchaseOrderPaid(
      connection,
      scoped.purchase_order_id,
      scoped.amount
    );

    await accountingModel.createFinancialTransaction(connection, {
      store_id: scoped.store_id,
      cash_account_id: scoped.cash_account_id,
      transaction_type: 'supplier_payment',
      direction: 'out',
      amount: scoped.amount,
      reference_type: 'supplier_payment',
      reference_id: paymentId,
      description: scoped.notes,
      created_by: userId
    });
  });

  return purchaseModel.getSupplierPaymentById(paymentId);
}

module.exports = {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  createSupplierPayment,
  deleteSupplier,
  getPurchaseOrder,
  getSupplier,
  listPurchaseOrders: (query, actor = {}) => purchaseModel.listPurchaseOrders(scopedQuery(query, actor)),
  listPurchaseOrderReceipts,
  listSupplierPayments: (query, actor = {}) => purchaseModel.listSupplierPayments(scopedQuery(query, actor)),
  listSuppliers: (query, actor = {}) => purchaseModel.listSuppliers(scopedQuery(query, actor)),
  receivePurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
  updateSupplier
};
