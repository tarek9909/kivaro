const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const inventoryModel = require('../inventory/inventory.model');
const stockService = require('../inventory/stock.service');
const locationModel = require('../locations/locations.model');
const customerModel = require('../customers/customers.model');
const paymentsModel = require('../payments/payments.model');
const accountingModel = require('../accounting/accounting.model');
const settingsService = require('../settings/settings.service');
const packagingModel = require('../packaging/packaging.model');
const model = require('./dispatch.model');

function splitGrossAmount(amount, source = {}) {
  const gross = decimal(amount);
  const sourceTotal = decimal(source.customer_total_amount || source.total_amount || 0);
  const sourceVat = decimal(source.vat_amount || 0);

  if (gross.lte(0) || sourceTotal.lte(0) || sourceVat.lte(0)) {
    return {
      subtotal_amount: toMoney(gross),
      vat_amount: toMoney(0)
    };
  }

  const vat = gross.mul(sourceVat).div(sourceTotal);
  return {
    subtotal_amount: toMoney(gross.minus(vat)),
    vat_amount: toMoney(vat)
  };
}

function addDerivedDispatchTotals(dispatch, customers = [], items = []) {
  const totalCost = items.reduce((sum, item) => sum.plus(item.total_cost || 0), decimal(0));
  const returnedSubtotal = items.reduce((sum, item) => sum.plus(item.returned_subtotal_amount || 0), decimal(0));
  const returnedVat = items.reduce((sum, item) => sum.plus(item.returned_vat_amount || 0), decimal(0));
  const returnedTotal = items.reduce((sum, item) => sum.plus(item.returned_total_amount || 0), decimal(0));

  return {
    ...dispatch,
    total_cost: toMoney(totalCost),
    returned_subtotal_amount: toMoney(returnedSubtotal),
    returned_vat_amount: toMoney(returnedVat),
    returned_total_amount: toMoney(returnedTotal),
    net_subtotal_amount: toMoney(decimal(dispatch.subtotal_amount || 0).minus(returnedSubtotal)),
    net_vat_amount: toMoney(decimal(dispatch.vat_amount || 0).minus(returnedVat)),
    net_total_amount: toMoney(decimal(dispatch.total_amount || 0).minus(returnedTotal)),
    customers,
    items
  };
}

function assertActive(row, field, label) {
  if (row?.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      { field, message: `${label} must be active` }
    ]);
  }

  return row;
}

function assertStockedVariant(variant, field = 'item_variant_id') {
  if (variant?.tracking_type !== 'stocked') {
    throw ApiError.badRequest('Validation failed', [
      { field, message: 'Item variant must belong to a stocked item' }
    ]);
  }

  return variant;
}

async function getDispatchRequest(id, actor = {}) {
  const dispatch = await model.findDispatchRequestById(id);
  assertRowInScope(dispatch, actor, 'Dispatch request not found');
  const [customers, items] = await Promise.all([
    model.getDispatchCustomers(id),
    model.getDispatchItems(id)
  ]);

  return addDerivedDispatchTotals(dispatch, customers, items);
}

async function createDispatchRequest(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const salesman = await locationModel.findSalesmanById(scoped.salesman_id);
  if (!salesman) throw ApiError.badRequest('Validation failed', [{ field: 'salesman_id', message: 'Salesman not found' }]);
  assertSameStore(salesman, scoped.store_id, 'salesman_id', 'Salesman does not belong to this store');
  assertActive(salesman, 'salesman_id', 'Salesman');

  const warehouse = await inventoryModel.findWarehouseById(scoped.warehouse_id);
  if (!warehouse) throw ApiError.badRequest('Validation failed', [{ field: 'warehouse_id', message: 'Warehouse not found' }]);
  assertSameStore(warehouse, scoped.store_id, 'warehouse_id', 'Warehouse does not belong to this store');
  assertActive(warehouse, 'warehouse_id', 'Warehouse');

  return model.createDispatchRequest({
    store_id: scoped.store_id,
    dispatch_number: scoped.dispatch_number || createDocumentNumber('DISP'),
    salesman_id: scoped.salesman_id,
    warehouse_id: scoped.warehouse_id,
    request_date: scoped.request_date,
    notes: scoped.notes,
    created_by: userId
  });
}

async function updateDispatchRequest(id, data, actor = {}) {
  const dispatch = await model.findDispatchRequestById(id);
  assertRowInScope(dispatch, actor, 'Dispatch request not found');
  if (dispatch.status !== 'draft') throw ApiError.conflict('Only draft dispatch requests can be edited');
  return model.updateDispatchRequest(id, data);
}

async function addCustomer(dispatchId, data, actor = {}) {
  const dispatch = await model.findDispatchRequestById(dispatchId);
  assertRowInScope(dispatch, actor, 'Dispatch request not found');
  if (dispatch.status !== 'draft') throw ApiError.conflict('Customers can only be added to draft dispatch requests');

  const customer = await customerModel.findCustomerById(data.customer_id);
  if (!customer) throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Customer not found' }]);
  assertSameStore(customer, dispatch.store_id, 'customer_id', 'Customer does not belong to this store');
  assertActive(customer, 'customer_id', 'Customer');
  if (customer.assigned_salesman_id && Number(customer.assigned_salesman_id) !== Number(dispatch.salesman_id)) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'customer_id', message: 'Customer is assigned to a different salesman' }
    ]);
  }
  const assignment = await locationModel.findActiveSalesmanSublocation(
    dispatch.salesman_id,
    customer.sublocation_id
  );
  if (!assignment) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'customer_id', message: 'Dispatch salesman is not assigned to this customer sublocation' }
    ]);
  }

  return model.createDispatchCustomer({
    store_id: dispatch.store_id,
    dispatch_request_id: dispatchId,
    customer_id: customer.id,
    location_id: customer.location_id,
    sublocation_id: customer.sublocation_id,
    receipt_number: data.receipt_number || createDocumentNumber('SALE'),
    notes: data.notes
  });
}

async function addItem(dispatchCustomerId, data, actor = {}) {
  const dispatchCustomer = await model.findDispatchCustomerById(dispatchCustomerId);
  assertRowInScope(dispatchCustomer, actor, 'Dispatch customer not found');

  const dispatch = await model.findDispatchRequestById(dispatchCustomer.dispatch_request_id);
  if (dispatch.status !== 'draft') throw ApiError.conflict('Items can only be added to draft dispatch requests');

  const variant = await inventoryModel.findVariantById(data.item_variant_id);
  if (!variant) throw ApiError.badRequest('Validation failed', [{ field: 'item_variant_id', message: 'Item variant not found' }]);
  assertSameStore(variant, dispatch.store_id, 'item_variant_id', 'Item variant does not belong to this store');
  assertActive(variant, 'item_variant_id', 'Item variant');
  assertStockedVariant(variant);

  let assignmentCost = null;
  if (data.packaging_assignment_id) {
    const assignment = await packagingModel.findAssignmentById(data.packaging_assignment_id);
    if (!assignment) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'packaging_assignment_id', message: 'Packaging assignment not found' }
      ]);
    }
    assertSameStore(assignment, dispatch.store_id, 'packaging_assignment_id', 'Packaging assignment does not belong to this store');
    if (!['batched', 'consumed'].includes(assignment.status)) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'packaging_assignment_id', message: 'Packaging assignment must be batched before dispatch' }
      ]);
    }
    if (Number(assignment.warehouse_id) !== Number(dispatch.warehouse_id)) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'packaging_assignment_id', message: 'Packaging assignment is in a different warehouse' }
      ]);
    }
    const allocatedQuantity = await packagingModel.getAssignmentAllocatedQuantity(assignment.id);
    const availableQuantity = decimal(assignment.produced_quantity || 0).minus(allocatedQuantity);
    if (decimal(data.quantity).gt(availableQuantity)) {
      throw ApiError.conflict(`Only ${toMoney(availableQuantity)} primary containers are available from this assignment`);
    }
    const calculation = typeof assignment.calculation_json === 'string'
      ? JSON.parse(assignment.calculation_json || '{}')
      : assignment.calculation_json || {};
    assignmentCost = calculation.cost_per_primary_container
      || calculation.cost_per_packaging_group
      || assignment.cost_per_kg;
  }

  const unitCost = data.unit_cost ?? assignmentCost ?? variant.cost;
  const vatSettings = await settingsService.getVatSettings({ ...actor, query: { store_id: dispatch.store_id } });
  const vatRate = vatSettings.enabled ? decimal(vatSettings.rate) : decimal(0);
  const subtotal = decimal(data.quantity).mul(data.unit_price);
  const vatAmount = subtotal.mul(vatRate).div(100);
  const item = await model.createDispatchItem({
    dispatch_customer_id: dispatchCustomerId,
    dispatch_request_id: dispatchCustomer.dispatch_request_id,
    item_variant_id: data.item_variant_id,
    packaging_assignment_id: data.packaging_assignment_id || null,
    quantity: data.quantity,
    unit_price: data.unit_price,
    unit_cost: unitCost,
    subtotal_amount: toMoney(subtotal),
    vat_rate: toMoney(vatRate),
    vat_amount: toMoney(vatAmount),
    line_total: toMoney(subtotal.plus(vatAmount))
  });
  await model.recalculateDispatchTotals(dispatchCustomer.dispatch_request_id);
  return item;
}

async function submitDispatch(id, actor = {}) {
  const dispatch = await getDispatchRequest(id, actor);

  if (dispatch.status !== 'draft') throw ApiError.conflict('Only draft dispatch requests can be submitted');
  if (dispatch.customers.length === 0 || dispatch.items.length === 0) {
    throw ApiError.conflict('Dispatch request must have at least one customer and item');
  }
  const customerIdsWithItems = new Set(dispatch.items.map((item) => Number(item.dispatch_customer_id)));
  const orphanCustomer = dispatch.customers.find((customer) => !customerIdsWithItems.has(Number(customer.id)));
  if (orphanCustomer) {
    throw ApiError.conflict('Every dispatch customer must have at least one item');
  }

  await model.updateDispatchRequest(id, { status: 'pending_approval' });
  return getDispatchRequest(id, actor);
}

async function approveDispatch(id, userId, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (dispatch.status !== 'pending_approval') throw ApiError.conflict('Only pending dispatch requests can be approved');

    const items = await model.aggregateDispatchItems(id, connection);
    for (const item of items) {
      assertStockedVariant(await inventoryModel.findVariantById(item.item_variant_id));
      await stockService.reserveStock(connection, {
        storeId: dispatch.store_id,
        warehouseId: dispatch.warehouse_id,
        itemVariantId: item.item_variant_id,
        quantity: item.quantity,
        movementType: 'dispatch_reserve',
        referenceType: 'dispatch_request',
        referenceId: id,
        notes: 'Reserve stock for approved dispatch',
        createdBy: userId
      });
    }

    await connection.execute(
      `UPDATE dispatch_requests
       SET status = 'approved', approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [userId, id]
    );
  });

  return getDispatchRequest(id, actor);
}

async function dispatchStock(id, userId, actor = {}) {
  const scopedDispatch = await getDispatchRequest(id, actor);
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    if (!dispatch) throw ApiError.notFound('Dispatch request not found');
    if (dispatch.status !== 'approved') throw ApiError.conflict('Only approved dispatch requests can be dispatched');

    const items = await model.aggregateDispatchItems(id, connection);
    for (const item of items) {
      assertStockedVariant(await inventoryModel.findVariantById(item.item_variant_id));
      await stockService.releaseReservedStock(connection, {
        storeId: scopedDispatch.store_id,
        warehouseId: dispatch.warehouse_id,
        itemVariantId: item.item_variant_id,
        quantity: item.quantity,
        movementType: 'dispatch_unreserve',
        referenceType: 'dispatch_request',
        referenceId: id,
        notes: 'Release reserved stock for dispatch',
        createdBy: userId
      });
      const movement = await stockService.decreaseStock(connection, {
        storeId: scopedDispatch.store_id,
        warehouseId: dispatch.warehouse_id,
        itemVariantId: item.item_variant_id,
        quantity: item.quantity,
        movementType: 'dispatch_out',
        referenceType: 'dispatch_request',
        referenceId: id,
        createdBy: userId
      });
      await model.updateDispatchItemUnitCost(connection, id, item.item_variant_id, movement.average_cost);
    }

    await connection.execute(
      `UPDATE dispatch_requests
       SET status = 'dispatched', dispatched_by = ?, dispatched_at = NOW()
       WHERE id = ?`,
      [userId, id]
    );
  });

  return getDispatchRequest(id, actor);
}

async function cancelDispatch(id, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (['dispatched', 'partially_settled', 'completed'].includes(dispatch.status)) {
      throw ApiError.conflict('Dispatched or completed dispatch requests cannot be cancelled here');
    }

    if (dispatch.status === 'approved') {
      const items = await model.aggregateDispatchItems(id, connection);
      for (const item of items) {
        await stockService.releaseReservedStock(connection, {
          storeId: dispatch.store_id,
          warehouseId: dispatch.warehouse_id,
          itemVariantId: item.item_variant_id,
          quantity: item.quantity,
          movementType: 'dispatch_unreserve',
          referenceType: 'dispatch_request',
          referenceId: id,
          notes: 'Release reserved stock for cancelled dispatch',
          createdBy: actor.id
        });
      }
    }

    await connection.execute(
      `UPDATE dispatch_requests
       SET status = 'cancelled'
       WHERE id = ?`,
      [id]
    );
  });
  return getDispatchRequest(id, actor);
}

async function createReturn(dispatchId, data, userId, actor = {}) {
  const dispatch = await model.findDispatchRequestById(dispatchId);
  assertRowInScope(dispatch, actor, 'Dispatch request not found');
  if (dispatch.status !== 'dispatched') {
    throw ApiError.conflict('Returns can only be recorded for dispatched requests before settlement');
  }

  let returnId;
  await withTransaction(async (connection) => {
    const lockedDispatch = await model.lockDispatchRequest(connection, dispatchId);
    if (!lockedDispatch || lockedDispatch.status !== 'dispatched') {
      throw ApiError.conflict('Returns can only be recorded for dispatched requests before settlement');
    }

    const activeSettlement = await model.findActiveSettlementByDispatch(
      dispatchId,
      connection,
      { forUpdate: true }
    );
    if (activeSettlement) {
      throw ApiError.conflict('Returns cannot be recorded after settlement has started');
    }

    const dispatchItem = await model.lockDispatchItem(connection, data.dispatch_item_id);
    if (!dispatchItem || Number(dispatchItem.dispatch_request_id) !== Number(dispatchId)) {
      throw ApiError.badRequest('Validation failed', [{ field: 'dispatch_item_id', message: 'Dispatch item does not belong to this dispatch' }]);
    }

    const remainingReturnable = decimal(dispatchItem.quantity).minus(dispatchItem.returned_quantity);
    if (decimal(data.returned_quantity).gt(remainingReturnable)) {
      throw ApiError.conflict('Returned quantity cannot exceed dispatched item quantity');
    }

    assertStockedVariant(await inventoryModel.findVariantById(dispatchItem.item_variant_id));

    returnId = await model.createDispatchReturn(connection, {
      store_id: lockedDispatch.store_id,
      dispatch_request_id: dispatchId,
      dispatch_item_id: data.dispatch_item_id,
      item_variant_id: dispatchItem.item_variant_id,
      returned_quantity: data.returned_quantity,
      reason: data.reason,
      created_by: userId
    });
    if (!dispatchItem.packaging_assignment_id) {
      await stockService.increaseStock(connection, {
        storeId: lockedDispatch.store_id,
        warehouseId: lockedDispatch.warehouse_id,
        itemVariantId: dispatchItem.item_variant_id,
        quantity: data.returned_quantity,
        unitCost: dispatchItem.unit_cost,
        movementType: 'dispatch_return',
        referenceType: 'dispatch_return',
        referenceId: returnId,
        notes: data.reason,
        createdBy: userId
      });
    }
  });

  return { id: returnId };
}

async function createSettlement(dispatchId, data, userId, actor = {}) {
  const dispatch = await getDispatchRequest(dispatchId, actor);
  if (!['dispatched', 'partially_settled'].includes(dispatch.status)) {
    throw ApiError.conflict('Only dispatched or partially settled requests can be settled');
  }

  return withTransaction(async (connection) => {
    const lockedDispatch = await model.lockDispatchRequest(connection, dispatchId);
    if (!lockedDispatch) throw ApiError.notFound('Dispatch request not found');
    if (!['dispatched', 'partially_settled'].includes(lockedDispatch.status)) {
      throw ApiError.conflict('Only dispatched or partially settled requests can be settled');
    }

    const activeSettlement = await model.findDraftSettlementByDispatch(
      dispatchId,
      connection,
      { forUpdate: true }
    );
    if (activeSettlement) {
      throw ApiError.conflict('This dispatch already has an active settlement');
    }

    return model.createSettlement({
      store_id: dispatch.store_id,
      dispatch_request_id: dispatchId,
      settlement_number: data.settlement_number || createDocumentNumber('SET'),
      settlement_date: data.settlement_date,
      total_expected: dispatch.net_total_amount ?? dispatch.total_amount,
      total_returned_value: dispatch.returned_total_amount || 0,
      status: 'draft',
      settled_by: userId,
      notes: data.notes
    }, connection);
  });
}

async function getSettlement(settlementId, actor = {}) {
  const settlement = await model.findSettlementById(settlementId);
  assertRowInScope(settlement, actor, 'Dispatch settlement not found');
  return {
    ...settlement,
    customers: await model.getSettlementCustomers(settlementId)
  };
}

async function listSettlements(dispatchId, actor = {}) {
  await getDispatchRequest(dispatchId, actor);
  return model.listSettlementsByDispatch(dispatchId);
}

async function addSettlementCustomer(settlementId, data, actor = {}) {
  let row;
  await withTransaction(async (connection) => {
    const settlement = await model.lockSettlement(connection, settlementId);
    assertRowInScope(settlement, actor, 'Dispatch settlement not found');
    if (settlement.status !== 'draft') throw ApiError.conflict('Only draft settlements can be edited');

    const dispatchCustomer = await model.findDispatchCustomerById(data.dispatch_customer_id);
    if (!dispatchCustomer || Number(dispatchCustomer.dispatch_request_id) !== Number(settlement.dispatch_request_id)) {
      throw ApiError.badRequest('Validation failed', [{ field: 'dispatch_customer_id', message: 'Dispatch customer does not belong to this settlement dispatch' }]);
    }
    const existingCustomers = await model.getSettlementCustomers(settlementId, connection, { forUpdate: true });
    if (existingCustomers.some((customer) => Number(customer.dispatch_customer_id) === Number(data.dispatch_customer_id))) {
      throw ApiError.conflict('Dispatch customer is already included in this settlement');
    }
    if (await model.findPostedSettlementCustomer(settlement.dispatch_request_id, data.dispatch_customer_id, connection)) {
      throw ApiError.conflict('Dispatch customer has already been settled');
    }

    const effectiveCustomers = await model.getDispatchCustomers(settlement.dispatch_request_id);
    const effectiveCustomer = effectiveCustomers.find((customer) => Number(customer.id) === Number(data.dispatch_customer_id));
    const expected = decimal(effectiveCustomer?.net_total_amount ?? dispatchCustomer.customer_total_amount);
    const collected = decimal(data.collected_amount);
    if (collected.gt(expected)) throw ApiError.conflict('Collected amount cannot exceed expected amount');
    const debt = expected.minus(collected);
    const settlementStatus = debt.eq(0) ? 'paid' : collected.eq(0) ? 'debt' : 'partial_debt';

    row = await model.addSettlementCustomer({
      dispatch_settlement_id: settlementId,
      dispatch_customer_id: data.dispatch_customer_id,
      customer_id: dispatchCustomer.customer_id,
      expected_amount: toMoney(expected),
      collected_amount: toMoney(collected),
      debt_amount: toMoney(debt),
      settlement_status: settlementStatus,
      notes: data.notes
    }, connection);

    await model.updateSettlementTotals(connection, settlementId);
  });
  return row;
}

async function completeSettlement(settlementId, data, userId, actor = {}) {
  await withTransaction(async (connection) => {
    const settlement = await model.lockSettlement(connection, settlementId);
    assertRowInScope(settlement, actor, 'Dispatch settlement not found');
    if (settlement.status !== 'draft') throw ApiError.conflict('Only draft settlements can be completed');

    const dispatch = await model.lockDispatchRequest(connection, settlement.dispatch_request_id);
    const customers = await model.getSettlementCustomers(settlementId, connection, { forUpdate: true });

    if (customers.length === 0) throw ApiError.conflict('Settlement must include at least one customer');
    const uniqueCustomerCount = new Set(customers.map((customer) => Number(customer.dispatch_customer_id))).size;
    if (uniqueCustomerCount !== customers.length) {
      throw ApiError.conflict('Settlement cannot include duplicate dispatch customers');
    }

    const totalExpected = customers.reduce(
      (sum, customer) => sum.plus(customer.expected_amount),
      decimal(0)
    );
    const totalCollected = customers.reduce(
      (sum, customer) => sum.plus(customer.collected_amount),
      decimal(0)
    );
    if (totalCollected.gt(0) && !data.cash_account_id) {
      throw ApiError.badRequest('Validation failed', [
        {
          field: 'cash_account_id',
          message: 'Cash account is required when collected amount is greater than zero'
        }
      ]);
    }
    if (data.cash_account_id) {
      const cashAccount = await accountingModel.findCashAccountById(data.cash_account_id);
      if (!cashAccount) {
        throw ApiError.badRequest('Validation failed', [
          {
            field: 'cash_account_id',
            message: 'Cash account not found'
          }
        ]);
      }
      assertSameStore(cashAccount, settlement.store_id, 'cash_account_id', 'Cash account does not belong to this store');
      if (cashAccount.status !== 'active') {
        throw ApiError.badRequest('Validation failed', [
          {
            field: 'cash_account_id',
            message: 'Cash account must be active'
          }
        ]);
      }
    }
    const totalDebt = customers.reduce(
      (sum, customer) => sum.plus(customer.debt_amount),
      decimal(0)
    );

    for (const customer of customers) {
      const dispatchCustomer = await model.findDispatchCustomerById(customer.dispatch_customer_id);
      const receiptNumber = dispatchCustomer.receipt_number || createDocumentNumber('SALE');
      if (!dispatchCustomer.receipt_number) {
        await model.updateDispatchCustomerReceiptNumber(connection, customer.dispatch_customer_id, receiptNumber);
      }
      const receiptVat = splitGrossAmount(customer.expected_amount, dispatchCustomer);
      const debtVat = splitGrossAmount(customer.debt_amount, dispatchCustomer);

      await model.updateDispatchCustomerSettlement(connection, customer.dispatch_customer_id, {
        collected_amount: customer.collected_amount,
        debt_amount: customer.debt_amount,
        payment_status: customer.settlement_status === 'paid' ? 'paid' : customer.settlement_status
      });

      let paymentId = null;
      if (decimal(customer.collected_amount).gt(0)) {
        paymentId = await paymentsModel.createPayment(connection, {
          store_id: settlement.store_id,
          customer_id: customer.customer_id,
          dispatch_request_id: dispatch.id,
          payment_date: settlement.settlement_date,
          amount: customer.collected_amount,
          payment_method: data.payment_method || 'cash',
          collected_by_salesman_id: dispatch.salesman_id,
          received_by_user_id: userId,
          notes: data.notes
        });

        await accountingModel.createFinancialTransaction(connection, {
          store_id: settlement.store_id,
          cash_account_id: data.cash_account_id,
          transaction_type: 'sale_collection',
          direction: 'in',
          amount: customer.collected_amount,
          reference_type: 'customer_payment',
          reference_id: paymentId,
          description: data.notes,
          created_by: userId
        });
      }

      if (decimal(customer.debt_amount).gt(0)) {
        await paymentsModel.createDebt(connection, {
          store_id: settlement.store_id,
          customer_id: customer.customer_id,
          salesman_id: dispatch.salesman_id,
          dispatch_request_id: dispatch.id,
          dispatch_customer_id: customer.dispatch_customer_id,
          debt_date: settlement.settlement_date,
          subtotal_amount: debtVat.subtotal_amount,
          vat_amount: debtVat.vat_amount,
          original_amount: customer.debt_amount,
          remaining_amount: customer.debt_amount,
          due_date: data.due_date,
          notes: data.notes,
          created_by: userId
        });
      }

      await paymentsModel.createReceipt(connection, {
        store_id: settlement.store_id,
        receipt_number: receiptNumber,
        customer_id: customer.customer_id,
        dispatch_request_id: dispatch.id,
        dispatch_customer_id: customer.dispatch_customer_id,
        customer_payment_id: paymentId,
        receipt_date: settlement.settlement_date,
        subtotal_amount: receiptVat.subtotal_amount,
        vat_amount: receiptVat.vat_amount,
        total_amount: customer.expected_amount,
        paid_amount: customer.collected_amount,
        remaining_amount: customer.debt_amount,
        receipt_type: decimal(customer.debt_amount).gt(0) ? 'debt' : 'sale',
        created_by: userId
      });
    }

    await model.updateSettlementTotals(connection, settlementId);
    await model.completeSettlement(connection, settlementId);
    const dispatchCustomerCount = await model.countDispatchCustomers(settlement.dispatch_request_id);
    const settledCustomerCount = await model.countPostedSettlementCustomers(settlement.dispatch_request_id, connection);
    const postedTotals = await model.sumPostedSettlementTotals(settlement.dispatch_request_id, connection);
    const nextDispatchStatus = settledCustomerCount >= dispatchCustomerCount ? 'completed' : 'partially_settled';
    const completionFields = nextDispatchStatus === 'completed'
      ? ', completed_by = ?, completed_at = NOW()'
      : ', completed_by = NULL, completed_at = NULL';
    const completionParams = nextDispatchStatus === 'completed' ? [userId] : [];
    await connection.execute(
      `UPDATE dispatch_requests
       SET status = ?,
         total_collected = ?,
         total_debt = ?
         ${completionFields}
       WHERE id = ?`,
      [
        nextDispatchStatus,
        toMoney(decimal(postedTotals.total_collected || 0)),
        toMoney(decimal(postedTotals.total_debt || 0)),
        ...completionParams,
        dispatch.id
      ]
    );
    await accountingModel.createSalesmanBalance(connection, {
      store_id: settlement.store_id,
      salesman_id: dispatch.salesman_id,
      dispatch_request_id: dispatch.id,
      balance_date: settlement.settlement_date,
      expected_amount: toMoney(totalExpected),
      collected_amount: toMoney(totalCollected),
      debt_amount: toMoney(totalDebt),
      returned_stock_value: settlement.total_returned_value || 0,
      status: 'open',
      notes: data.notes
    });
  });

  return getDispatchRequest((await model.findSettlementById(settlementId)).dispatch_request_id, actor);
}

async function cancelSettlement(settlementId, actor = {}) {
  let dispatchId;
  await withTransaction(async (connection) => {
    const settlement = await model.lockSettlement(connection, settlementId);
    assertRowInScope(settlement, actor, 'Dispatch settlement not found');
    if (settlement.status !== 'draft') throw ApiError.conflict('Only draft settlements can be cancelled');
    dispatchId = settlement.dispatch_request_id;
    await model.cancelSettlement(connection, settlementId);
  });

  return getDispatchRequest(dispatchId, actor);
}

module.exports = {
  addCustomer,
  addItem,
  addSettlementCustomer,
  approveDispatch,
  cancelDispatch,
  cancelSettlement,
  completeSettlement,
  createDispatchRequest,
  createReturn,
  createSettlement,
  dispatchStock,
  getDispatchRequest,
  getSettlement,
  listDispatchRequests: (query, actor = {}) => model.listDispatchRequests(scopedQuery(query, actor)),
  listSettlements,
  submitDispatch,
  updateDispatchRequest
};
