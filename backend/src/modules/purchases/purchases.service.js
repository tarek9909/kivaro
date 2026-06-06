const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const { writeAuditLog } = require('../../middleware/audit.middleware');
const accountingModel = require('../accounting/accounting.model');
const inventoryModel = require('../inventory/inventory.model');
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

function assertStockedItem(item, field = 'items.item_id') {
  if (item?.tracking_type !== 'stocked') {
    throw ApiError.badRequest('Validation failed', [
      { field, message: 'Item must be stocked' }
    ]);
  }

  return item;
}

function normalizeItemQuantity(item, quantity, field) {
  const value = decimal(quantity);
  if (item?.base_unit_type === 'quantity' && !value.isInteger()) {
    throw ApiError.badRequest('Validation failed', [
      { field, message: 'Piece-based quantities must be whole numbers' }
    ]);
  }

  if (item?.base_unit_type === 'weight') {
    return value.mul(item.base_unit_conversion_to_base || 1);
  }

  return value;
}

function normalizeItemUnitCost(item, unitCost) {
  if (unitCost === null || unitCost === undefined) {
    return unitCost;
  }

  if (item?.base_unit_type === 'weight') {
    return decimal(unitCost).div(item.base_unit_conversion_to_base || 1);
  }

  return decimal(unitCost);
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
    assertStockedItem(stockItem, field);
    normalizeItemQuantity(stockItem, item.ordered_quantity, `items.${index}.ordered_quantity`);
    resolvedItems.push({
      ...item,
      item_id: stockItem.id,
      item_variant_id: null
    });
  }

  return resolvedItems;
}

async function increaseItemStock(connection, data) {
  const normalizedQuantity = normalizeItemQuantity(data.item, data.quantity, data.field || 'items.received_quantity');
  const normalizedUnitCost = normalizeItemUnitCost(data.item, data.unitCost);
  const balance = await inventoryModel.getOrCreateItemStockBalanceForUpdate(connection, {
    store_id: data.storeId,
    warehouse_id: data.warehouseId,
    item_id: data.itemId
  });
  const quantityBefore = decimal(balance.quantity_on_hand || 0);
  const quantityAfter = quantityBefore.plus(normalizedQuantity);

  await inventoryModel.updateItemStockBalance(connection, balance.id, {
    quantity_on_hand: toMoney(quantityAfter)
  });
  await inventoryModel.createItemStockAdjustment(connection, {
    store_id: data.storeId,
    warehouse_id: data.warehouseId,
    item_id: data.itemId,
    quantity_change: toMoney(normalizedQuantity),
    quantity_before: toMoney(quantityBefore),
    quantity_after: toMoney(quantityAfter),
    unit_cost: normalizedUnitCost === null || normalizedUnitCost === undefined ? normalizedUnitCost : toMoney(normalizedUnitCost),
    notes: data.notes,
    created_by: data.createdBy
  });
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
        item_variant_id: null,
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
  const totalOrdered = items.reduce((sum, item) => sum.plus(item.ordered_quantity), decimal(0));
  const totalReceived = items.reduce((sum, item) => sum.plus(item.received_quantity), decimal(0));

  if (totalReceived.eq(0)) {
    return 'approved';
  }

  return totalReceived.eq(totalOrdered) ? 'received' : 'partially_received';
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

      const remainingQuantity = decimal(poItem.ordered_quantity).minus(poItem.received_quantity);

      if (decimal(item.received_quantity).gt(remainingQuantity)) {
        throw ApiError.conflict('Cannot receive more than ordered quantity');
      }

      const stockItem = assertStockedItem(
        await inventoryModel.findItemById(poItem.item_id),
        'items.item_id'
      );
      assertSameStore(stockItem, scopedOrder.store_id, 'items.item_id', 'Item does not belong to this store');
      assertActive(stockItem, 'items.item_id', 'Item');
      normalizeItemQuantity(stockItem, item.received_quantity, `items.${index}.received_quantity`);

      await purchaseModel.createReceiptItem(connection, {
        purchase_receipt_id: newReceiptId,
        purchase_order_item_id: poItem.id,
        item_id: poItem.item_id,
        item_variant_id: null,
        received_quantity: item.received_quantity,
        unit_cost: item.unit_cost ?? poItem.unit_cost
      });
      await purchaseModel.incrementReceivedQuantity(
        connection,
        poItem.id,
        item.received_quantity
      );
      poItem.received_quantity = toMoney(decimal(poItem.received_quantity).plus(item.received_quantity));

      await increaseItemStock(connection, {
        storeId: scopedOrder.store_id,
        warehouseId: purchaseOrder.warehouse_id,
        itemId: poItem.item_id,
        item: stockItem,
        quantity: item.received_quantity,
        unitCost: item.unit_cost ?? poItem.unit_cost,
        field: `items.${index}.received_quantity`,
        notes: data.notes,
        createdBy: userId
      });
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
