const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const inventoryModel = require('../inventory/inventory.model');
const stockService = require('../inventory/stock.service');
const locationModel = require('../locations/locations.model');
const targetCollections = require('../locations/targetCollections.service');
const customerModel = require('../customers/customers.model');
const accountingModel = require('../accounting/accounting.model');
const packagingService = require('../packaging/packaging.service');
const packagingModel = require('../packaging/packaging.model');
const paymentsModel = require('../payments/payments.model');
const storeConfigService = require('../../services/storeConfig.service');
const model = require('./dispatch.model');

const WHOLE_QUANTITY_FULFILLMENTS = new Set([
  'normal_carton',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);
const NORMAL_FULFILLMENTS = new Set([
  'normal_carton',
  'normal_weight',
  'normal_piece'
]);
const FULL_DISPATCH_READ_PERMISSIONS = new Set([
  'dispatch.view',
  'dispatch.create',
  'dispatch.approve',
  'dispatch.settle',
  'dispatch.print',
  'invoices.view',
  'invoices.print'
]);

function hasPermission(actor = {}, permission) {
  if (actor.is_superadmin) return true;
  const permissions = new Set(actor.permissions || []);
  return permissions.has('*') || permissions.has(permission);
}

function hasCloseoutAuthority(actor = {}) {
  return [
    'delivery.closeout',
    'dispatch.settle',
    'finance.settle_deliveries'
  ].some((permission) => hasPermission(actor, permission));
}

function isSalesmanWorkspaceOnly(actor = {}) {
  if (actor.is_superadmin) return false;
  const permissions = new Set(actor.permissions || []);
  if (permissions.has('*')) return false;
  const canManageOthers = [
    'pos.create_for_salesman',
    'dispatch.view',
    'dispatch.create',
    'dispatch.approve',
    'dispatch.settle',
    'delivery.release',
    'delivery.dispatch',
    'delivery.record_returns',
    'delivery.closeout',
    'finance.settle_deliveries'
  ].some((p) => permissions.has(p));
  if (canManageOthers) return false;
  return permissions.has('salesman_workspace.view') || permissions.has('pos.create_own');
}

function assertDispatchReadScope(dispatch, actor = {}, message = 'Dispatch request not found') {
  assertRowInScope(dispatch, actor, message);
  if (isSalesmanWorkspaceOnly(actor) && Number(dispatch.salesman_user_id) !== Number(actor.id)) {
    throw ApiError.notFound(message);
  }
  return dispatch;
}

function assertDispatchWriteScope(dispatch, actor = {}, message = 'Dispatch request not found') {
  assertRowInScope(dispatch, actor, message);
  if (isSalesmanWorkspaceOnly(actor) && Number(dispatch.salesman_user_id) !== Number(actor.id)) {
    throw ApiError.forbidden('You do not have permission to modify another salesman\'s request');
  }
  return dispatch;
}

async function salespersonScopedQuery(input = {}, actor = {}) {
  const scoped = scopedQuery(input, actor);
  if (!isSalesmanWorkspaceOnly(actor)) return scoped;
  const salesman = await model.findSalesmanByUserId(actor.id, scoped.store_id);
  if (!salesman || salesman.status !== 'active') {
    throw ApiError.forbidden('An active salesman link is required for workspace dispatch access');
  }
  return { ...scoped, salesman_id: salesman.id };
}

function assertActive(row, field, label) {
  if (!row || row.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field, message: `${label} must be active` }]);
  }
  return row;
}

function quantity(value, field, whole = false) {
  const parsed = decimal(value);
  if (!parsed.isFinite() || parsed.lte(0)) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Quantity must be greater than zero' }]);
  }
  if (whole && !parsed.isInteger()) {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Quantity must be a whole number' }]);
  }
  return parsed;
}

function decimalMin(left, right) {
  const leftValue = decimal(left);
  const rightValue = decimal(right);
  return leftValue.lte(rightValue) ? leftValue : rightValue;
}

function splitGrossAmount(amount, source = {}) {
  const gross = decimal(amount);
  const sourceTotal = decimal(source.customer_total_amount || source.total_amount || 0);
  const sourceVat = decimal(source.vat_amount || 0);
  if (gross.lte(0) || sourceTotal.lte(0) || sourceVat.lte(0)) {
    return { subtotal_amount: toMoney(gross), vat_amount: toMoney(0) };
  }
  const vat = gross.mul(sourceVat).div(sourceTotal);
  return { subtotal_amount: toMoney(gross.minus(vat)), vat_amount: toMoney(vat) };
}

function netLineAmount(line) {
  const ordered = decimal(line.quantity || 0);
  if (ordered.lte(0)) return decimal(0);
  const delivered = decimal(line.quantity || 0).minus(line.returned_quantity || 0);
  return decimal(line.line_total || 0).mul(delivered.lt(0) ? 0 : delivered).div(ordered);
}

function netCustomerAmount(customerId, items = []) {
  return items
    .filter((item) => Number(item.dispatch_customer_id) === Number(customerId))
    .reduce((total, item) => total.plus(netLineAmount(item)), decimal(0));
}

function mapStatusToLifecycle(status) {
  switch (status) {
    case 'draft':
    case 'pending_approval':
      return 'pending';
    case 'approved':
      return 'released';
    case 'delivery':
      return 'out_for_delivery';
    case 'partially_settled':
      return 'closeout_pending';
    case 'completed':
      return 'settled';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapCustomerFulfillmentStatus(dispatchStatus, customStatus) {
  if (customStatus) return customStatus;
  switch (dispatchStatus) {
    case 'draft':
    case 'pending_approval':
      return 'pending';
    case 'approved':
      return 'released';
    case 'delivery':
      return 'out_for_delivery';
    case 'partially_settled':
    case 'completed':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function getBatchCapabilities(dispatch, actor = {}) {
  const isOwner = Number(dispatch.salesman_user_id) === Number(actor.id);
  const lifecycle = dispatch.lifecycle_status || mapStatusToLifecycle(dispatch.status);

  const canCreateOwn = hasPermission(actor, 'pos.create_own');
  const canManagePending = hasPermission(actor, 'pos.create_for_salesman') || hasPermission(actor, 'dispatch.create');
  const canRelease = hasPermission(actor, 'delivery.release') || hasPermission(actor, 'dispatch.approve');
  const canDispatch = hasPermission(actor, 'delivery.dispatch') || hasPermission(actor, 'dispatch.approve');
  const canRecordReturns = hasPermission(actor, 'delivery.record_returns')
    || hasPermission(actor, 'dispatch.settle')
    || hasPermission(actor, 'finance.settle_deliveries')
    || (isOwner && hasPermission(actor, 'salesman_workspace.view'));
  const canCloseout = hasCloseoutAuthority(actor);
  const canSettle = hasPermission(actor, 'finance.settle_deliveries') || hasPermission(actor, 'dispatch.settle');

  const isPending = lifecycle === 'pending';
  const isReleased = lifecycle === 'released';
  const isOutForDelivery = lifecycle === 'out_for_delivery';
  const isCloseoutPending = lifecycle === 'closeout_pending';
  const canManageOwnDraft = canManagePending || (isOwner && canCreateOwn);

  return {
    can_edit: dispatch.status === 'draft' && canManageOwnDraft,
    can_submit: dispatch.status === 'draft' && canManageOwnDraft,
    can_rework: ['pending_approval', 'approved'].includes(dispatch.status) && canManageOwnDraft,
    can_cancel: (isPending || isReleased) && canManageOwnDraft,
    can_release: isPending && canRelease,
    can_dispatch: isReleased && canDispatch,
    can_record_returns: ['delivery', 'partially_settled', 'completed'].includes(dispatch.status) && canRecordReturns,
    can_closeout: (isOutForDelivery || isCloseoutPending) && canCloseout,
    can_settle: (isOutForDelivery || isCloseoutPending) && canSettle
  };
}

async function getDispatchRequest(id, actor = {}, connection = null) {
  const dispatch = await model.findDispatchRequestById(id, connection);
  assertDispatchReadScope(dispatch, actor, 'Dispatch request not found');
  const [customers, items, invoices, documentChecklist, returnCreditNotes] = await Promise.all([
    model.getDispatchCustomers(id, connection),
    model.getDispatchItems(id, connection),
    model.getInvoicesForDispatch(id, connection),
    model.getDocumentChecklist(id, dispatch.revision, connection),
    typeof model.listReturnCreditNotesForDispatch === 'function'
      ? model.listReturnCreditNotesForDispatch(id, connection)
      : Promise.resolve([])
  ]);
  const allocationCost = items.reduce((total, item) => total.plus(item.allocated_total_cost || 0), decimal(0));
  const giftCost = items
    .filter((item) => item.line_type === 'free_gift')
    .reduce((total, item) => total.plus(item.allocated_total_cost || 0), decimal(0));

  const lifecycleStatus = dispatch.lifecycle_status || mapStatusToLifecycle(dispatch.status);
  const normalizedCustomers = customers.map((c) => ({
    ...c,
    fulfillment_status: c.fulfillment_status || mapCustomerFulfillmentStatus(dispatch.status, c.fulfillment_status)
  }));

  return {
    ...dispatch,
    batch_id: dispatch.id,
    origin: dispatch.origin || 'direct',
    lifecycle_status: lifecycleStatus,
    assigned_salesman: {
      id: dispatch.salesman_id,
      name: dispatch.salesman_name,
      user_id: dispatch.salesman_user_id
    },
    warehouse: {
      id: dispatch.warehouse_id,
      name: dispatch.warehouse_name
    },
    capabilities: getBatchCapabilities(dispatch, actor),
    customers: normalizedCustomers,
    items,
    invoices,
    return_credit_notes: returnCreditNotes,
    document_checklist: documentChecklist,
    total_cost: toMoney(allocationCost),
    gift_cost: toMoney(giftCost),
    sale_cost: toMoney(allocationCost.minus(giftCost))
  };
}

async function validateSalesmanAndWarehouse(data, actor = {}) {
  const salesman = await locationModel.findSalesmanById(data.salesman_id);
  if (!salesman) throw ApiError.badRequest('Validation failed', [{ field: 'salesman_id', message: 'Salesman not found' }]);
  assertSameStore(salesman, data.store_id, 'salesman_id', 'Salesman does not belong to this store');
  assertActive(salesman, 'salesman_id', 'Salesman');
  const warehouse = await inventoryModel.findWarehouseById(data.warehouse_id);
  if (!warehouse) throw ApiError.badRequest('Validation failed', [{ field: 'warehouse_id', message: 'Warehouse not found' }]);
  assertSameStore(warehouse, data.store_id, 'warehouse_id', 'Warehouse does not belong to this store');
  assertActive(warehouse, 'warehouse_id', 'Warehouse');

  if (warehouse.location_id) {
    const territories = await posModel.listSalesmanTerritories(salesman.id);
    const belongsToLocation = territories.some((t) => Number(t.location_id) === Number(warehouse.location_id));
    if (!belongsToLocation) {
      throw ApiError.badRequest('Validation failed', [{ field: 'warehouse_id', message: 'Salesman is not assigned to the location of the selected warehouse' }]);
    }
  }

  return { salesman, warehouse };
}

async function assertDispatchCreateScope(data, actor = {}) {
  if (actor.is_superadmin || hasPermission(actor, 'dispatch.create') || hasPermission(actor, 'pos.create_for_salesman')) {
    return;
  }
  if (!hasPermission(actor, 'pos.create_own')) {
    throw ApiError.forbidden('You do not have permission to create an order');
  }
  const salesman = await model.findSalesmanByUserId(actor.id, data.store_id);
  if (!salesman || salesman.status !== 'active' || Number(salesman.id) !== Number(data.salesman_id)) {
    throw ApiError.forbidden('POS users may create orders only for their own active salesman account');
  }
}

async function prepareDiscountedCustomerLines(customerPayload, connection) {
  const preparedLines = [];
  for (const line of customerPayload.lines || []) {
    const entry = await packagingModel.findSaleCatalogEntryById(line.sale_catalog_entry_id, connection);
    if (!entry || entry.status !== 'active') throw ApiError.conflict('A selected sale offer is not active');
    const lineType = line.line_type || 'sale';
    const lineQuantity = quantity(line.quantity, 'quantity', WHOLE_QUANTITY_FULFILLMENTS.has(entry.entry_type));
    const unitPrice = lineType === 'free_gift' ? decimal(0) : decimal(line.unit_price !== undefined ? line.unit_price : entry.default_price);
    if (!unitPrice.isFinite() || unitPrice.lt(0)) {
      throw ApiError.badRequest('Validation failed', [{ field: 'unit_price', message: 'Price cannot be negative' }]);
    }
    const vatRate = lineType === 'free_gift' ? decimal(0) : decimal(line.vat_rate !== undefined ? line.vat_rate : (entry.vat_rate || 0));
    preparedLines.push({ entry, lineType, lineQuantity, unitPrice, vatRate, originalSubtotal: lineQuantity.mul(unitPrice) });
  }

  const saleSubtotal = preparedLines
    .filter((line) => line.lineType === 'sale')
    .reduce((total, line) => total.plus(line.originalSubtotal), decimal(0));
  const rawType = customerPayload.discount_type || null;
  const discountValue = decimal(customerPayload.discount_value || 0);
  if (!discountValue.isFinite() || discountValue.lt(0)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'discount_value', message: 'Discount must be zero or greater' }]);
  }
  if (!rawType && discountValue.gt(0)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'discount_type', message: 'Choose a discount type' }]);
  }
  if (rawType && !['percent', 'fixed'].includes(rawType)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'discount_type', message: 'Discount type is invalid' }]);
  }
  if (rawType === 'percent' && discountValue.gt(100)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'discount_value', message: 'Percentage discount cannot exceed 100%' }]);
  }
  const discountAmount = rawType === 'percent'
    ? saleSubtotal.mul(discountValue).div(100)
    : rawType === 'fixed'
      ? discountValue
      : decimal(0);
  if (discountAmount.gt(saleSubtotal)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'discount_value', message: 'Fixed discount cannot exceed the customer sale subtotal' }]);
  }

  let allocatedDiscount = decimal(0);
  const saleLines = preparedLines.filter((line) => line.lineType === 'sale');
  return {
    discount_type: rawType && discountValue.gt(0) ? rawType : null,
    discount_value: rawType ? toMoney(discountValue) : toMoney(0),
    discount_amount: toMoney(discountAmount),
    lines: preparedLines.map((line) => {
      let discountedSubtotal = line.originalSubtotal;
      if (line.lineType === 'sale' && discountAmount.gt(0)) {
        const isLastSaleLine = line === saleLines[saleLines.length - 1];
        const lineDiscount = isLastSaleLine
          ? discountAmount.minus(allocatedDiscount)
          : discountAmount.mul(line.originalSubtotal).div(saleSubtotal);
        allocatedDiscount = allocatedDiscount.plus(lineDiscount);
        discountedSubtotal = line.originalSubtotal.minus(lineDiscount);
      }
      const effectiveUnitPrice = line.lineType === 'free_gift'
        ? decimal(0)
        : discountedSubtotal.div(line.lineQuantity);
      const vatAmount = discountedSubtotal.mul(line.vatRate).div(100);
      return { ...line, discountedSubtotal, effectiveUnitPrice, vatAmount };
    })
  };
}

async function createCustomerLines(dispatch, customerPayload, dispatchCustomer, connection) {
  const prepared = await prepareDiscountedCustomerLines(customerPayload, connection);
  await model.updateDispatchCustomer(dispatchCustomer.id, {
    discount_type: prepared.discount_type,
    discount_value: prepared.discount_value,
    discount_amount: prepared.discount_amount
  }, connection);
  for (const line of prepared.lines) {
    await model.createDispatchItem({
      store_id: dispatch.store_id,
      dispatch_customer_id: dispatchCustomer.id,
      dispatch_request_id: dispatch.id,
      sale_catalog_entry_id: line.entry.id,
      item_id: line.entry.item_id || null,
      packaging_group_id: line.entry.packaging_group_id || null,
      line_type: line.lineType,
      fulfillment_type: line.entry.entry_type,
      quantity: toMoney(line.lineQuantity),
      unit_price: toMoney(line.effectiveUnitPrice),
      unit_cost: 0,
      subtotal_amount: toMoney(line.discountedSubtotal),
      vat_rate: toMoney(line.vatRate),
      vat_amount: toMoney(line.vatAmount),
      line_total: toMoney(line.discountedSubtotal.plus(line.vatAmount)),
      item_name_snapshot: catalogLineName(line.entry),
      unit_label_snapshot: line.entry.unit_label || 'unit'
    }, connection);
  }
}

async function createDispatchRequest(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  if (!scoped.salesman_id && isSalesmanWorkspaceOnly(actor)) {
    const salesman = await model.findSalesmanByUserId(actor.id, scoped.store_id);
    if (!salesman || salesman.status !== 'active') {
      throw ApiError.forbidden('An active salesman link is required to create an order');
    }
    scoped.salesman_id = salesman.id;
  }
  await assertDispatchCreateScope(scoped, actor);
  await validateSalesmanAndWarehouse(scoped, actor);

  if (Array.isArray(scoped.customers) && scoped.customers.length > 0) {
    const dispatchId = await withTransaction(async (connection) => {
      const dispatch = await model.createDispatchRequest({
        ...scoped,
        origin: 'direct',
        dispatch_number: scoped.dispatch_number || createDocumentNumber('DISP'),
        created_by: userId
      }, connection);

      for (const customerPayload of scoped.customers) {
        const customer = await customerModel.findCustomerById(customerPayload.customer_id, connection);
        if (!customer) throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Customer not found' }]);
        assertSameStore(customer, scoped.store_id, 'customer_id', 'Customer does not belong to this store');
        assertActive(customer, 'customer_id', 'Customer');
        if (customer.assigned_salesman_id && Number(customer.assigned_salesman_id) !== Number(scoped.salesman_id)) {
          throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: `Customer #${customer.id} is assigned to another salesman` }]);
        }
        const territory = await locationModel.findActiveSalesmanSublocation(scoped.salesman_id, customer.sublocation_id);
        if (!territory) {
          throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: `Salesman is not assigned to territory of customer #${customer.id}` }]);
        }

        const dispatchCustomer = await model.createDispatchCustomer({
          store_id: dispatch.store_id,
          dispatch_request_id: dispatch.id,
          customer_id: customerPayload.customer_id,
          location_id: customerPayload.location_id || customer.location_id,
          sublocation_id: customerPayload.sublocation_id || customer.sublocation_id,
          notes: customerPayload.notes || null
        }, connection);
        await createCustomerLines(dispatch, customerPayload, dispatchCustomer, connection);
      }
      await model.recalculateDispatchTotals(connection, dispatch.id);
      return dispatch.id;
    });
    return getDispatchRequest(dispatchId, actor);
  }

  const dispatch = await model.createDispatchRequest({
    ...scoped,
    origin: scoped.origin || 'direct',
    dispatch_number: scoped.dispatch_number || createDocumentNumber('DISP'),
    created_by: userId
  });
  return getDispatchRequest(dispatch.id, actor);
}

async function updateDispatchRequest(id, data, actor = {}) {
  const dispatch = await model.findDispatchRequestById(id);
  assertDispatchWriteScope(dispatch, actor, 'Dispatch request not found');
  if (dispatch.status !== 'draft') throw ApiError.conflict('Only draft dispatches can be edited');

  return withTransaction(async (connection) => {
    const { store_id, salesman_id, warehouse_id, customers, ...updates } = data;
    const targetSalesmanId = salesman_id || dispatch.salesman_id;
    const targetWarehouseId = warehouse_id || dispatch.warehouse_id;

    if (salesman_id || warehouse_id) {
      await validateSalesmanAndWarehouse({
        store_id: dispatch.store_id,
        salesman_id: targetSalesmanId,
        warehouse_id: targetWarehouseId
      }, actor);
      if (salesman_id) updates.salesman_id = salesman_id;
      if (warehouse_id) updates.warehouse_id = warehouse_id;
    }

    if (Object.keys(updates).length > 0) {
      await model.updateDispatchRequest(id, updates, connection);
    }

    if (Array.isArray(customers) && customers.length > 0) {
      await connection.execute('DELETE FROM dispatch_items WHERE dispatch_request_id = ?', [id]);
      await connection.execute('DELETE FROM dispatch_customers WHERE dispatch_request_id = ?', [id]);

      for (const customerPayload of customers) {
        const customer = await customerModel.findCustomerById(customerPayload.customer_id, connection);
        if (!customer) throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Customer not found' }]);
        assertSameStore(customer, dispatch.store_id, 'customer_id', 'Customer does not belong to this store');
        assertActive(customer, 'customer_id', 'Customer');
        if (customer.assigned_salesman_id && Number(customer.assigned_salesman_id) !== Number(targetSalesmanId)) {
          throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: `Customer #${customer.id} is assigned to another salesman` }]);
        }
        const territory = await locationModel.findActiveSalesmanSublocation(targetSalesmanId, customer.sublocation_id);
        if (!territory) {
          throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: `Salesman is not assigned to territory of customer #${customer.id}` }]);
        }

        const dispatchCustomer = await model.createDispatchCustomer({
          store_id: dispatch.store_id,
          dispatch_request_id: dispatch.id,
          customer_id: customerPayload.customer_id,
          location_id: customerPayload.location_id || customer.location_id,
          sublocation_id: customerPayload.sublocation_id || customer.sublocation_id,
          notes: customerPayload.notes || null
        }, connection);
        await createCustomerLines(dispatch, customerPayload, dispatchCustomer, connection);
      }
      await model.recalculateDispatchTotals(connection, id);
    }

    const committedDispatch = await getDispatchRequest(id, actor, connection);
    // The transaction read is authoritative. Merge scalar changes as a
    // compatibility fallback for database adapters that return a stale row
    // within a transaction (and for lightweight test adapters).
    return { ...committedDispatch, ...updates };
  });
}

async function addCustomer(dispatchId, data, actor = {}) {
  const dispatch = await model.findDispatchRequestById(dispatchId);
  assertDispatchWriteScope(dispatch, actor, 'Dispatch request not found');
  if (dispatch.status !== 'draft') throw ApiError.conflict('Customers can only be added to a draft dispatch');
  const customer = await customerModel.findCustomerById(data.customer_id);
  if (!customer) throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Customer not found' }]);
  assertSameStore(customer, dispatch.store_id, 'customer_id', 'Customer does not belong to this store');
  assertActive(customer, 'customer_id', 'Customer');
  if (customer.assigned_salesman_id && Number(customer.assigned_salesman_id) !== Number(dispatch.salesman_id)) {
    throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Customer belongs to another salesman' }]);
  }
  const territory = await locationModel.findActiveSalesmanSublocation(dispatch.salesman_id, customer.sublocation_id);
  if (!territory) {
    throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Salesman is not assigned to this customer territory' }]);
  }
  return model.createDispatchCustomer({
    store_id: dispatch.store_id,
    dispatch_request_id: dispatch.id,
    customer_id: customer.id,
    location_id: customer.location_id,
    sublocation_id: customer.sublocation_id,
    receipt_number: data.receipt_number || null,
    notes: data.notes
  });
}

function catalogLineName(entry) {
  return entry.display_name || entry.item_name || entry.packaging_group_name || 'Catalog item';
}

async function addItem(dispatchCustomerId, data, actor = {}, options = {}) {
  const dispatchCustomer = await model.findDispatchCustomerById(dispatchCustomerId);
  assertDispatchWriteScope(dispatchCustomer, actor, 'Dispatch customer not found');
  if (dispatchCustomer.dispatch_status !== 'draft') throw ApiError.conflict('Items can only be added to a draft dispatch');
  const entry = await packagingService.assertCatalogOffer(data.sale_catalog_entry_id, actor);
  const lineType = data.line_type || 'sale';
  const itemQuantity = quantity(data.quantity, 'quantity', WHOLE_QUANTITY_FULFILLMENTS.has(entry.entry_type));
  const requestedPrice = options.forceCatalogPrice ? entry.default_price : data.unit_price;
  const unitPrice = lineType === 'free_gift' ? decimal(0) : decimal(requestedPrice ?? entry.default_price);
  if (unitPrice.lt(0)) throw ApiError.badRequest('Validation failed', [{ field: 'unit_price', message: 'Price cannot be negative' }]);
  const vatRate = lineType === 'free_gift' ? decimal(0) : decimal(entry.vat_rate || 0);
  const subtotal = itemQuantity.mul(unitPrice);
  const vatAmount = subtotal.mul(vatRate).div(100);
  const dispatchItem = await withTransaction(async (connection) => {
    const item = await model.createDispatchItem({
      store_id: dispatchCustomer.store_id,
      dispatch_customer_id: dispatchCustomer.id,
      dispatch_request_id: dispatchCustomer.dispatch_request_id,
      sale_catalog_entry_id: entry.id,
      item_id: entry.item_id || null,
      packaging_group_id: entry.packaging_group_id || null,
      line_type: lineType,
      fulfillment_type: entry.entry_type,
      quantity: toMoney(itemQuantity),
      unit_price: toMoney(unitPrice),
      unit_cost: 0,
      subtotal_amount: toMoney(subtotal),
      vat_rate: toMoney(vatRate),
      vat_amount: toMoney(vatAmount),
      line_total: toMoney(subtotal.plus(vatAmount)),
      item_name_snapshot: catalogLineName(entry),
      unit_label_snapshot: entry.unit_label || 'unit'
    }, connection);
    await model.recalculateDispatchTotals(connection, dispatchCustomer.dispatch_request_id);
    return item;
  });
  return dispatchItem;
}

async function updateItem(dispatchItemId, data, actor = {}) {
  return withTransaction(async (connection) => {
    const existing = await model.findDispatchItemById(dispatchItemId, connection, true);
    assertDispatchWriteScope(existing, actor, 'Dispatch line not found');
    if (existing.dispatch_status !== 'draft') throw ApiError.conflict('Only draft dispatch lines can be edited');

    const entry = await packagingService.assertCatalogOffer(
      data.sale_catalog_entry_id || existing.sale_catalog_entry_id,
      actor
    );
    const lineType = data.line_type || existing.line_type;
    const itemQuantity = quantity(
      data.quantity === undefined ? existing.quantity : data.quantity,
      'quantity',
      WHOLE_QUANTITY_FULFILLMENTS.has(entry.entry_type)
    );
    const changedOffer = Number(entry.id) !== Number(existing.sale_catalog_entry_id);
    const becameSale = existing.line_type === 'free_gift' && lineType === 'sale';
    const requestedPrice = data.unit_price === undefined
      ? (changedOffer || becameSale ? entry.default_price : existing.unit_price)
      : data.unit_price;
    const unitPrice = lineType === 'free_gift' ? decimal(0) : decimal(requestedPrice ?? entry.default_price);
    if (unitPrice.lt(0)) throw ApiError.badRequest('Validation failed', [{ field: 'unit_price', message: 'Price cannot be negative' }]);
    const vatRate = lineType === 'free_gift' ? decimal(0) : decimal(entry.vat_rate || 0);
    const subtotal = itemQuantity.mul(unitPrice);
    const vatAmount = subtotal.mul(vatRate).div(100);

    const dispatchItem = await model.updateDispatchItem(existing.id, {
      sale_catalog_entry_id: entry.id,
      item_id: entry.item_id || null,
      packaging_group_id: entry.packaging_group_id || null,
      line_type: lineType,
      fulfillment_type: entry.entry_type,
      quantity: toMoney(itemQuantity),
      unit_price: toMoney(unitPrice),
      unit_cost: 0,
      subtotal_amount: toMoney(subtotal),
      vat_rate: toMoney(vatRate),
      vat_amount: toMoney(vatAmount),
      line_total: toMoney(subtotal.plus(vatAmount)),
      item_name_snapshot: catalogLineName(entry),
      unit_label_snapshot: entry.unit_label || 'unit'
    }, connection);
    await model.recalculateDispatchTotals(connection, existing.dispatch_request_id);
    return dispatchItem;
  });
}

async function deleteItem(dispatchItemId, actor = {}) {
  let dispatchId;
  await withTransaction(async (connection) => {
    const existing = await model.findDispatchItemById(dispatchItemId, connection, true);
    assertDispatchWriteScope(existing, actor, 'Dispatch line not found');
    if (existing.dispatch_status !== 'draft') throw ApiError.conflict('Only draft dispatch lines can be removed');
    dispatchId = existing.dispatch_request_id;
    await model.deleteDispatchItem(existing.id, connection);
    await model.recalculateDispatchTotals(connection, dispatchId);
  });
  return getDispatchRequest(dispatchId, actor);
}

function ensureDispatchContent(customers, items) {
  if (!customers.length || !items.length) throw ApiError.conflict('A dispatch requires at least one customer and line');
  const customerIds = new Set(items.map((item) => Number(item.dispatch_customer_id)));
  if (customers.some((customer) => !customerIds.has(Number(customer.id)))) {
    throw ApiError.conflict('Each dispatch customer requires at least one line');
  }
}

async function issueInvoices(connection, dispatch, userId) {
  const [customers, items] = await Promise.all([
    model.getDispatchCustomers(dispatch.id, connection),
    model.getDispatchItems(dispatch.id, connection)
  ]);
  ensureDispatchContent(customers, items);
  for (const customer of customers) {
    const customerItems = items.filter((item) => Number(item.dispatch_customer_id) === Number(customer.id));
    const invoice = await model.createInvoice(connection, {
      store_id: dispatch.store_id,
      dispatch_request_id: dispatch.id,
      dispatch_customer_id: customer.id,
      invoice_number: createDocumentNumber('INV'),
      revision: dispatch.revision,
      subtotal_amount: customerItems.reduce((total, item) => total.plus(item.subtotal_amount), decimal(0)).toFixed(4),
      vat_amount: customerItems.reduce((total, item) => total.plus(item.vat_amount), decimal(0)).toFixed(4),
      total_amount: customerItems.reduce((total, item) => total.plus(item.line_total), decimal(0)).toFixed(4),
      created_by: userId
    });
    for (const item of customerItems) {
      await model.createInvoiceLine(connection, {
        invoice_id: invoice.id,
        dispatch_item_id: item.id,
        line_type: item.line_type,
        description: item.item_name_snapshot,
        quantity: item.quantity,
        unit_label: item.unit_label_snapshot,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        subtotal_amount: item.subtotal_amount,
        vat_rate: item.vat_rate,
        vat_amount: item.vat_amount,
        line_total: item.line_total
      });
    }
  }
}

async function submitDispatch(id, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (dispatch.status !== 'draft') throw ApiError.conflict('Only draft dispatches can be submitted');
    await model.recalculateDispatchTotals(connection, id);
    await issueInvoices(connection, dispatch, actor.id);
    await model.updateDispatchRequest(id, {
      status: 'pending_approval',
      submitted_by: actor.id,
      submitted_at: new Date()
    }, connection);
  });
  return getDispatchRequest(id, actor);
}

async function getItemForDispatch(itemId, storeId, connection) {
  const item = await inventoryModel.findItemById(itemId, connection);
  if (!item || Number(item.store_id) !== Number(storeId)) throw ApiError.badRequest('Dispatch line item no longer exists in this store');
  assertActive(item, 'item_id', 'Item');
  return item;
}

async function createAllocation(connection, dispatch, line, data) {
  return model.createDispatchLineAllocation(connection, {
    store_id: dispatch.store_id,
    dispatch_item_id: line.id,
    warehouse_id: dispatch.warehouse_id,
    ...data,
    status: 'reserved'
  });
}

async function allocateNormalCartons(connection, dispatch, line, item, userId) {
  const cartonCount = quantity(line.quantity, 'quantity', true);
  const inventoryQuantity = cartonCount;
  const reservation = await stockService.reserveItemStock(connection, {
    storeId: dispatch.store_id,
    warehouseId: dispatch.warehouse_id,
    itemId: item.id,
    item,
    quantity: inventoryQuantity,
    movementType: 'dispatch_reserve',
    referenceType: 'dispatch_request',
    referenceId: dispatch.id,
    notes: 'Reserve sealed cartons for dispatch',
    createdBy: userId
  });
  const lots = await inventoryModel.getAvailableCartonLotsForUpdate(connection, dispatch.warehouse_id, item.id);
  let remaining = cartonCount;
  const unitCost = decimal(reservation.average_cost);
  let totalCost = decimal(0);
  for (const lot of lots) {
    if (remaining.eq(0)) break;
    const available = decimal(lot.available_cartons === undefined ? lot.remaining_cartons : lot.available_cartons);
    if (available.lte(0)) continue;
    const allocated = available.lt(remaining) ? available : remaining;
    const allocationCost = allocated.mul(unitCost);
    await createAllocation(connection, dispatch, line, {
      item_id: item.id,
      carton_stock_lot_id: lot.id,
      allocation_type: 'carton_lot',
      allocated_quantity: toMoney(allocated),
      inventory_quantity: toMoney(allocated),
      unit_cost: toMoney(unitCost),
      total_cost: toMoney(allocationCost)
    });
    remaining = remaining.minus(allocated);
    totalCost = totalCost.plus(allocationCost);
  }
  if (remaining.gt(0)) throw ApiError.conflict('Insufficient unreserved sealed cartons');
  return totalCost;
}

async function allocateNormalLooseUnits(connection, dispatch, line, item, userId) {
  const looseUnits = quantity(line.quantity, 'quantity', true);
  const unitWeight = decimal(item.kg_per_carton).div(item.loose_units_per_carton);
  const inventoryQuantity = looseUnits.mul(unitWeight);
  const reservation = await stockService.reserveItemStock(connection, {
    storeId: dispatch.store_id,
    warehouseId: dispatch.warehouse_id,
    itemId: item.id,
    item,
    quantity: inventoryQuantity,
    movementType: 'dispatch_reserve',
    referenceType: 'dispatch_request',
    referenceId: dispatch.id,
    notes: 'Reserve loose carton units for dispatch',
    createdBy: userId
  });
  const unitCost = decimal(reservation.average_cost);
  let remaining = looseUnits;
  let totalCost = decimal(0);
  let shelf = await inventoryModel.getActiveOpenCartonShelfForUpdate(connection, dispatch.warehouse_id, item.id);
  if (!shelf && remaining.gt(0)) {
    const lots = await inventoryModel.getAvailableCartonLotsForUpdate(connection, dispatch.warehouse_id, item.id);
    let firstLot = null;
    for (const lot of lots) {
      const availableCartons = decimal(lot.available_cartons === undefined ? lot.remaining_cartons : lot.available_cartons);
      if (availableCartons.mul(lot.loose_units_per_carton).gt(0)) {
        firstLot = lot;
        break;
      }
    }
    if (firstLot) {
      shelf = await stockService.openCartonForReservation(connection, {
        storeId: dispatch.store_id,
        warehouseId: dispatch.warehouse_id,
        itemId: item.id,
        item,
        cartonLotId: firstLot.id,
        movementType: 'carton_open',
        referenceType: 'dispatch_request',
        referenceId: dispatch.id,
        notes: 'Open carton for dispatch loose-unit reservation',
        createdBy: userId
      });
      shelf = await inventoryModel.getActiveOpenCartonShelfForUpdate(connection, dispatch.warehouse_id, item.id);
    }
  }
  if (shelf) {
    const available = decimal(shelf.available_loose_units === undefined ? shelf.remaining_loose_units : shelf.available_loose_units);
    const allocated = available.lt(remaining) ? available : remaining;
    if (allocated.gt(0)) {
      const allocationCost = allocated.mul(unitWeight).mul(unitCost);
      await createAllocation(connection, dispatch, line, {
        item_id: item.id,
        carton_stock_lot_id: shelf.carton_lot_id,
        open_carton_shelf_id: shelf.id,
        allocation_type: 'open_carton_shelf',
        allocated_quantity: toMoney(allocated),
        inventory_quantity: toMoney(allocated.mul(unitWeight)),
        unit_cost: toMoney(unitCost),
        total_cost: toMoney(allocationCost)
      });
      remaining = remaining.minus(allocated);
      totalCost = totalCost.plus(allocationCost);
    }
  }
  if (remaining.gt(0)) {
    const lots = await inventoryModel.getAvailableCartonLotsForUpdate(connection, dispatch.warehouse_id, item.id);
    for (const lot of lots) {
      if (remaining.eq(0)) break;
      const availableCartons = decimal(lot.available_cartons === undefined ? lot.remaining_cartons : lot.available_cartons);
      const unitsPerCarton = decimal(lot.loose_units_per_carton);
      let lotCapacity = availableCartons.mul(unitsPerCarton);
      // A physical carton must be opened for each lot allocation at dispatch.
      // Keep every allocation to at most one carton so the source stays exact.
      while (remaining.gt(0) && lotCapacity.gt(0)) {
        const allocated = decimalMin(remaining, decimalMin(lotCapacity, unitsPerCarton));
        const allocationCost = allocated.mul(unitWeight).mul(unitCost);
        await createAllocation(connection, dispatch, line, {
          item_id: item.id,
          carton_stock_lot_id: lot.id,
          allocation_type: 'carton_lot',
          allocated_quantity: toMoney(allocated),
          inventory_quantity: toMoney(allocated.mul(unitWeight)),
          unit_cost: toMoney(unitCost),
          total_cost: toMoney(allocationCost)
        });
        remaining = remaining.minus(allocated);
        lotCapacity = lotCapacity.minus(allocated);
        totalCost = totalCost.plus(allocationCost);
      }
    }
  }
  if (remaining.gt(0)) throw ApiError.conflict('Insufficient unreserved loose carton units');
  return totalCost;
}

async function allocateNormalStandard(connection, dispatch, line, item, userId) {
  const requested = quantity(line.quantity, 'quantity', item.stock_mode === 'piece');
  const reservation = await stockService.reserveItemStock(connection, {
    storeId: dispatch.store_id,
    warehouseId: dispatch.warehouse_id,
    itemId: item.id,
    item,
    quantity: requested,
    movementType: 'dispatch_reserve',
    referenceType: 'dispatch_request',
    referenceId: dispatch.id,
    notes: 'Reserve item stock for dispatch',
    createdBy: userId
  });
  const unitCost = decimal(reservation.average_cost);
  const totalCost = requested.mul(unitCost);
  await createAllocation(connection, dispatch, line, {
    item_id: item.id,
    allocation_type: 'item_balance',
    allocated_quantity: toMoney(requested),
    inventory_quantity: toMoney(requested),
    unit_cost: toMoney(unitCost),
    total_cost: toMoney(totalCost)
  });
  return totalCost;
}

async function lockReadyContainers(connection, warehouseId, groupId, statuses) {
  const placeholders = statuses.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `SELECT * FROM ready_stock_containers
     WHERE warehouse_id = ? AND packaging_group_id = ? AND status IN (${placeholders})
     ORDER BY created_at ASC, id ASC
     FOR UPDATE`,
    [warehouseId, groupId, ...statuses]
  );
  return rows;
}

async function readyReservationState(connection, containerId) {
  const [rows] = await connection.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN di.fulfillment_type = 'ready_outer_carton' THEN dla.allocated_quantity ELSE 0 END), 0) AS reserved_outer,
       COALESCE(SUM(CASE WHEN di.fulfillment_type = 'ready_inner_unit' THEN dla.allocated_quantity ELSE 0 END), 0) AS reserved_inner
     FROM dispatch_line_allocations dla
     JOIN dispatch_items di ON di.id = dla.dispatch_item_id
     WHERE dla.ready_stock_container_id = ? AND dla.status = 'reserved'`,
    [containerId]
  );
  return rows[0] || { reserved_outer: 0, reserved_inner: 0 };
}

async function allocateReadyOuter(connection, dispatch, line) {
  const needed = quantity(line.quantity, 'quantity', true);
  const containers = await lockReadyContainers(connection, dispatch.warehouse_id, line.packaging_group_id, ['full']);
  let remaining = needed;
  let totalCost = decimal(0);
  for (const container of containers) {
    if (remaining.eq(0)) break;
    const held = await readyReservationState(connection, container.id);
    if (decimal(held.reserved_outer).gt(0) || decimal(held.reserved_inner).gt(0)) continue;
    const allocationCost = decimal(container.remaining_cost);
    await createAllocation(connection, dispatch, line, {
      ready_stock_container_id: container.id,
      allocation_type: 'ready_stock_container',
      allocated_quantity: 1,
      inventory_quantity: 1,
      unit_cost: toMoney(allocationCost),
      total_cost: toMoney(allocationCost)
    });
    remaining = remaining.minus(1);
    totalCost = totalCost.plus(allocationCost);
  }
  if (remaining.gt(0)) throw ApiError.conflict('Insufficient full ready cartons');
  return totalCost;
}

async function allocateReadyInner(connection, dispatch, line) {
  let remaining = quantity(line.quantity, 'quantity', true);
  const containers = await lockReadyContainers(connection, dispatch.warehouse_id, line.packaging_group_id, ['full', 'partial']);
  let totalCost = decimal(0);
  for (const container of containers) {
    if (remaining.eq(0)) break;
    const held = await readyReservationState(connection, container.id);
    if (decimal(held.reserved_outer).gt(0)) continue;
    const available = decimal(container.remaining_inner_quantity).minus(held.reserved_inner);
    if (available.lte(0)) continue;
    const allocated = available.lt(remaining) ? available : remaining;
    const unitCost = decimal(container.remaining_cost).div(container.remaining_inner_quantity);
    const allocationCost = allocated.mul(unitCost);
    await createAllocation(connection, dispatch, line, {
      ready_stock_container_id: container.id,
      allocation_type: 'ready_stock_container',
      allocated_quantity: toMoney(allocated),
      inventory_quantity: toMoney(allocated),
      unit_cost: toMoney(unitCost),
      total_cost: toMoney(allocationCost)
    });
    remaining = remaining.minus(allocated);
    totalCost = totalCost.plus(allocationCost);
  }
  if (remaining.gt(0)) throw ApiError.conflict('Insufficient ready inner bags');
  return totalCost;
}

async function allocateDispatchLine(connection, dispatch, line, userId) {
  let totalCost;
  if (line.fulfillment_type === 'normal_carton') {
    totalCost = await allocateNormalCartons(connection, dispatch, line, await getItemForDispatch(line.item_id, dispatch.store_id, connection), userId);
  } else if (line.fulfillment_type === 'normal_loose_unit') {
    totalCost = await allocateNormalLooseUnits(connection, dispatch, line, await getItemForDispatch(line.item_id, dispatch.store_id, connection), userId);
  } else if (line.fulfillment_type === 'normal_weight' || line.fulfillment_type === 'normal_piece') {
    totalCost = await allocateNormalStandard(connection, dispatch, line, await getItemForDispatch(line.item_id, dispatch.store_id, connection), userId);
  } else if (line.fulfillment_type === 'ready_outer_carton') {
    totalCost = await allocateReadyOuter(connection, dispatch, line);
  } else if (line.fulfillment_type === 'ready_inner_unit') {
    totalCost = await allocateReadyInner(connection, dispatch, line);
  } else {
    throw ApiError.badRequest(`Unsupported fulfillment type ${line.fulfillment_type}`);
  }
  await model.updateDispatchItem(line.id, {
    unit_cost: toMoney(totalCost.div(line.quantity))
  }, connection);
}

async function approveDispatch(id, userId, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertDispatchWriteScope(dispatch, actor, 'Dispatch request not found');
    if (dispatch.status !== 'pending_approval') throw ApiError.conflict('Only submitted dispatches can be approved');
    const [customers, lines] = await Promise.all([
      model.getDispatchCustomers(id, connection),
      model.getDispatchItems(id, connection)
    ]);
    ensureDispatchContent(customers, lines);
    for (const line of lines) await allocateDispatchLine(connection, dispatch, line, userId);
    await model.updateDispatchRequest(id, { status: 'approved', approved_by: userId, approved_at: new Date() }, connection);
    await model.updateDispatchCustomersFulfillmentStatus(id, 'released', connection);
  });
  return getDispatchRequest(id, actor);
}

async function consumeReadyAllocation(connection, allocation, line, userId) {
  const container = await packagingModel.lockReadyStockContainer(connection, allocation.ready_stock_container_id);
  if (!container) throw ApiError.conflict('Allocated ready-stock container no longer exists');
  const allocated = decimal(allocation.allocated_quantity);
  const cost = decimal(allocation.total_cost);
  const beforeInner = decimal(container.remaining_inner_quantity);
  const beforeCost = decimal(container.remaining_cost);
  if (line.fulfillment_type === 'ready_outer_carton') {
    if (!allocated.eq(1) || container.status !== 'full' || !beforeInner.eq(container.initial_inner_quantity)) {
      throw ApiError.conflict('Ready carton is no longer available as a whole carton');
    }
    await packagingModel.updateReadyStockContainer(connection, container.id, {
      remaining_inner_quantity: 0,
      remaining_cost: 0,
      status: 'depleted'
    });
    await packagingModel.createReadyStockMovement(connection, {
      store_id: allocation.store_id,
      warehouse_id: allocation.warehouse_id,
      ready_stock_container_id: container.id,
      movement_type: line.line_type === 'free_gift' ? 'gift_out' : 'dispatch_out',
      inner_quantity_change: toMoney(beforeInner.neg()),
      inner_quantity_before: toMoney(beforeInner),
      inner_quantity_after: 0,
      cost_change: toMoney(beforeCost.neg()),
      cost_before: toMoney(beforeCost),
      cost_after: 0,
      reference_type: 'dispatch_item',
      reference_id: line.id,
      notes: 'Dispatch ready carton',
      created_by: userId
    });
    return;
  }
  if (!['full', 'partial'].includes(container.status) || beforeInner.lt(allocated)) {
    throw ApiError.conflict('Ready inner bags are no longer available');
  }
  const afterInner = beforeInner.minus(allocated);
  const afterCost = beforeCost.minus(cost);
  const status = afterInner.eq(0) ? 'depleted' : 'partial';
  await packagingModel.updateReadyStockContainer(connection, container.id, {
    remaining_inner_quantity: toMoney(afterInner),
    remaining_cost: toMoney(afterCost.lt(0) ? 0 : afterCost),
    status
  });
  await packagingModel.createReadyStockMovement(connection, {
    store_id: allocation.store_id,
    warehouse_id: allocation.warehouse_id,
    ready_stock_container_id: container.id,
    movement_type: line.line_type === 'free_gift' ? 'gift_out' : 'dispatch_out',
    inner_quantity_change: toMoney(allocated.neg()),
    inner_quantity_before: toMoney(beforeInner),
    inner_quantity_after: toMoney(afterInner),
    cost_change: toMoney(cost.neg()),
    cost_before: toMoney(beforeCost),
    cost_after: toMoney(afterCost.lt(0) ? 0 : afterCost),
    reference_type: 'dispatch_item',
    reference_id: line.id,
    notes: 'Dispatch ready inner bags',
    created_by: userId
  });
}

async function dispatchNormalLine(connection, dispatch, line, allocations, userId) {
  const item = await getItemForDispatch(line.item_id, dispatch.store_id, connection);
  const common = {
    storeId: dispatch.store_id,
    warehouseId: dispatch.warehouse_id,
    itemId: item.id,
    item,
    consumeReserved: true,
    movementType: line.line_type === 'free_gift' ? 'gift_out' : 'dispatch_out',
    referenceType: 'dispatch_request',
    referenceId: dispatch.id,
    notes: `Dispatch ${dispatch.dispatch_number}`,
    createdBy: userId
  };
  if (line.fulfillment_type === 'normal_carton') {
    await stockService.consumeSealedCartons(connection, {
      ...common,
      cartonCount: line.quantity,
      sourceAllocations: allocations.map((allocation) => ({
        carton_lot_id: allocation.carton_stock_lot_id,
        carton_count: allocation.allocated_quantity
      }))
    });
  } else if (line.fulfillment_type === 'normal_loose_unit') {
    const result = await stockService.consumeCartonLooseUnits(connection, {
      ...common,
      looseUnits: line.quantity,
      sourceAllocations: allocations.map((allocation) => allocation.open_carton_shelf_id
        ? { open_carton_shelf_id: allocation.open_carton_shelf_id, loose_units: allocation.allocated_quantity }
        : { carton_lot_id: allocation.carton_stock_lot_id, loose_units: allocation.allocated_quantity })
    });
    for (const allocation of allocations.filter((entry) => !entry.open_carton_shelf_id)) {
      const physical = (result.carton_allocations || []).find((entry) =>
        Number(entry.carton_lot_id) === Number(allocation.carton_stock_lot_id)
      );
      if (physical?.open_carton_shelf_id) {
        await model.updateDispatchLineAllocation(connection, allocation.id, {
          open_carton_shelf_id: physical.open_carton_shelf_id,
          allocation_type: 'open_carton_shelf'
        });
      }
    }
  } else {
    await stockService.decreaseItemStock(connection, { ...common, quantity: line.quantity });
  }
}

async function dispatchStock(id, userId, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertDispatchWriteScope(dispatch, actor, 'Dispatch request not found');
    if (dispatch.status !== 'approved') throw ApiError.conflict('Only approved dispatches can be physically dispatched');
    const checklist = await model.getDocumentChecklist(id, dispatch.revision, connection);
    if (!checklist.ready_for_dispatch) {
      throw ApiError.conflict('Generate the customer and quantity list before issuing delivery');
    }
    const lines = await model.getDispatchItems(id, connection);
    for (const line of lines) {
      const allocations = (await model.getLineAllocations(line.id, connection, true)).filter((allocation) => allocation.status === 'reserved');
      if (!allocations.length) throw ApiError.conflict('Every dispatch line must have a current reservation');
      if (NORMAL_FULFILLMENTS.has(line.fulfillment_type)) {
        await dispatchNormalLine(connection, dispatch, line, allocations, userId);
      } else {
        for (const allocation of allocations) await consumeReadyAllocation(connection, allocation, line, userId);
      }
      for (const allocation of allocations) await model.updateDispatchLineAllocation(connection, allocation.id, { status: 'dispatched' });
    }
    await model.updateDispatchRequest(id, { status: 'delivery', dispatched_by: userId, dispatched_at: new Date() }, connection);
    await model.updateDispatchCustomersFulfillmentStatus(id, 'out_for_delivery', connection);
  });
  return getDispatchRequest(id, actor);
}

async function releaseReservations(connection, dispatch, userId, reason) {
  const allocations = await model.getDispatchAllocations(dispatch.id, connection, true);
  const byItem = new Map();
  for (const allocation of allocations.filter((entry) => entry.status === 'reserved' && entry.item_id)) {
    const existing = byItem.get(Number(allocation.item_id)) || decimal(0);
    byItem.set(Number(allocation.item_id), existing.plus(allocation.inventory_quantity));
  }
  for (const [itemId, inventoryQuantity] of byItem) {
    const item = await getItemForDispatch(itemId, dispatch.store_id, connection);
    await stockService.releaseReservedItemStock(connection, {
      storeId: dispatch.store_id,
      warehouseId: dispatch.warehouse_id,
      itemId,
      item,
      quantity: inventoryQuantity,
      movementType: 'dispatch_unreserve',
      referenceType: 'dispatch_request',
      referenceId: dispatch.id,
      notes: reason,
      createdBy: userId
    });
  }
  for (const allocation of allocations.filter((entry) => entry.status === 'reserved')) {
    await model.updateDispatchLineAllocation(connection, allocation.id, { status: 'released' });
  }
}

async function reworkDispatch(id, data, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertDispatchWriteScope(dispatch, actor, 'Dispatch request not found');
    if (!['pending_approval', 'approved'].includes(dispatch.status)) {
      throw ApiError.conflict('Only submitted or approved dispatches can be returned to draft');
    }
    if (dispatch.status === 'approved') await releaseReservations(connection, dispatch, actor.id, 'Release reservation for dispatch rework');
    await model.voidInvoicesForDispatchRevision(connection, id, dispatch.revision, actor.id, data.reason || 'Dispatch returned to draft for correction');
    await connection.execute(
      `UPDATE dispatch_requests
       SET status = 'draft', revision = revision + 1, submitted_by = NULL, submitted_at = NULL,
         approved_by = NULL, approved_at = NULL
       WHERE id = ?`,
      [id]
    );
    await model.updateDispatchCustomersFulfillmentStatus(id, 'pending', connection);
  });
  return getDispatchRequest(id, actor);
}

async function cancelDispatch(id, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertDispatchWriteScope(dispatch, actor, 'Dispatch request not found');
    if (['delivery', 'partially_settled', 'completed'].includes(dispatch.status)) {
      throw ApiError.conflict('A dispatched or settled dispatch cannot be cancelled');
    }
    if (dispatch.status === 'approved') await releaseReservations(connection, dispatch, actor.id, 'Release reservation for cancelled dispatch');
    if (['pending_approval', 'approved'].includes(dispatch.status)) {
      await model.voidInvoicesForDispatchRevision(connection, id, dispatch.revision, actor.id, 'Dispatch cancelled');
    }
    await model.updateDispatchRequest(id, { status: 'cancelled', cancelled_by: actor.id, cancelled_at: new Date() }, connection);
    await model.updateDispatchCustomersFulfillmentStatus(id, 'cancelled', connection);
  });
  return getDispatchRequest(id, actor);
}

async function restoreReadyAllocation(connection, allocation, line, userId) {
  const container = await packagingModel.lockReadyStockContainer(connection, allocation.ready_stock_container_id);
  if (!container) return false;
  const returned = decimal(allocation.allocated_quantity);
  const cost = decimal(allocation.total_cost);
  const beforeInner = decimal(container.remaining_inner_quantity);
  const beforeCost = decimal(container.remaining_cost);
  const afterInner = beforeInner.plus(line.fulfillment_type === 'ready_outer_carton'
    ? container.initial_inner_quantity
    : returned);
  const afterCost = beforeCost.plus(cost);
  if (afterInner.gt(container.initial_inner_quantity)) return false;
  const status = afterInner.eq(container.initial_inner_quantity) ? 'full' : 'partial';
  await packagingModel.updateReadyStockContainer(connection, container.id, {
    remaining_inner_quantity: toMoney(afterInner),
    remaining_cost: toMoney(afterCost),
    status
  });
  await packagingModel.createReadyStockMovement(connection, {
    store_id: allocation.store_id,
    warehouse_id: allocation.warehouse_id,
    ready_stock_container_id: container.id,
    movement_type: 'return',
    inner_quantity_change: toMoney(afterInner.minus(beforeInner)),
    inner_quantity_before: toMoney(beforeInner),
    inner_quantity_after: toMoney(afterInner),
    cost_change: toMoney(cost),
    cost_before: toMoney(beforeCost),
    cost_after: toMoney(afterCost),
    reference_type: 'dispatch_item',
    reference_id: line.id,
    notes: 'Return to ready stock',
    created_by: userId
  });
  return true;
}

async function restoreNormalAllocation(connection, allocation, line, userId) {
  const item = await getItemForDispatch(allocation.item_id, allocation.store_id, connection);
  await stockService.increaseItemStock(connection, {
    storeId: allocation.store_id,
    warehouseId: allocation.warehouse_id,
    itemId: item.id,
    item,
    quantity: allocation.inventory_quantity,
    unitCost: allocation.unit_cost,
    allowCartonWeightQuantity: true,
    movementType: 'return',
    referenceType: 'dispatch_item',
    referenceId: line.id,
    notes: 'Return from dispatch',
    createdBy: userId
  });
  if (line.fulfillment_type === 'normal_carton' && allocation.carton_stock_lot_id) {
    const lot = await inventoryModel.getCartonLotForUpdate(connection, allocation.carton_stock_lot_id);
    if (lot) {
      await inventoryModel.updateCartonStockLot(connection, lot.id, {
        remaining_cartons: Number(decimal(lot.remaining_cartons).plus(allocation.allocated_quantity).toString())
      });
    }
  }
  if (line.fulfillment_type === 'normal_loose_unit' && allocation.open_carton_shelf_id) {
    const shelf = await inventoryModel.getOpenCartonShelfForUpdate(connection, allocation.open_carton_shelf_id);
    if (!shelf) return;
    const returningUnits = decimal(allocation.allocated_quantity);
    const activeShelf = await inventoryModel.getActiveOpenCartonShelfForUpdate(
      connection,
      allocation.warehouse_id,
      item.id
    );
    if (shelf.status === 'closed' && activeShelf && Number(activeShelf.id) !== Number(shelf.id)) return;
    const nextUnits = decimal(shelf.remaining_loose_units).plus(returningUnits);
    if (nextUnits.gt(shelf.initial_loose_units)) return;
    await inventoryModel.updateOpenCartonShelf(connection, shelf.id, {
      remaining_loose_units: Number(nextUnits.toString()),
      status: 'open',
      closed_at: null
    });
  }
}

async function createReturn(dispatchId, data, userId, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, dispatchId);
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (isSalesmanWorkspaceOnly(actor)) {
      const scopedDispatch = await model.findDispatchRequestById(dispatchId, connection);
      assertSalesmanCloseoutAccess(scopedDispatch, actor);
    }
    if (!['delivery', 'partially_settled', 'completed'].includes(dispatch.status)) throw ApiError.conflict('Returns require a delivery');
    const draftSettlements = await model.listSettlementsByDispatch(dispatchId, connection);
    if (draftSettlements.some((settlement) => settlement.status === 'draft')) {
      throw ApiError.conflict('Reopen the draft closeout before recording a return');
    }
    const line = await model.findDispatchItemById(data.dispatch_item_id, connection, true);
    if (!line || Number(line.dispatch_request_id) !== Number(dispatchId)) {
      throw ApiError.badRequest('Validation failed', [{ field: 'dispatch_item_id', message: 'Line does not belong to this dispatch' }]);
    }
    const returned = quantity(data.returned_quantity, 'returned_quantity', WHOLE_QUANTITY_FULFILLMENTS.has(line.fulfillment_type));
    if (decimal(line.quantity).minus(line.returned_quantity).lt(returned)) throw ApiError.conflict('Return quantity exceeds dispatched quantity');
    let remaining = returned;
    const allocations = (await model.getLineAllocations(line.id, connection, true)).filter((allocation) => allocation.status === 'dispatched');
    for (const allocation of allocations) {
      if (remaining.eq(0)) break;
      const allocationQuantity = decimal(allocation.allocated_quantity);
      const restoring = allocationQuantity.lt(remaining) ? allocationQuantity : remaining;
      const ratio = restoring.div(allocationQuantity);
      const returnedAllocation = {
        ...allocation,
        allocated_quantity: toMoney(restoring),
        inventory_quantity: toMoney(decimal(allocation.inventory_quantity).mul(ratio)),
        total_cost: toMoney(decimal(allocation.total_cost).mul(ratio))
      };
      if (line.fulfillment_type.startsWith('ready_')) {
        await restoreReadyAllocation(connection, returnedAllocation, line, userId);
      } else {
        await restoreNormalAllocation(connection, returnedAllocation, line, userId);
      }
      if (restoring.eq(allocationQuantity)) {
        await model.updateDispatchLineAllocation(connection, allocation.id, { status: 'returned' });
      } else {
        await model.updateDispatchLineAllocation(connection, allocation.id, {
          allocated_quantity: toMoney(allocationQuantity.minus(restoring)),
          inventory_quantity: toMoney(decimal(allocation.inventory_quantity).minus(returnedAllocation.inventory_quantity)),
          total_cost: toMoney(decimal(allocation.total_cost).minus(returnedAllocation.total_cost))
        });
        await model.createDispatchLineAllocation(connection, { ...returnedAllocation, status: 'returned' });
      }
      remaining = remaining.minus(restoring);
    }
    if (remaining.gt(0)) throw ApiError.conflict('No dispatched allocation is available to return');
    await model.updateDispatchItem(line.id, { returned_quantity: toMoney(decimal(line.returned_quantity).plus(returned)) }, connection);
    const returnId = await model.createDispatchReturn(connection, {
      store_id: dispatch.store_id,
      dispatch_request_id: dispatch.id,
      dispatch_item_id: line.id,
      returned_quantity: toMoney(returned),
      reason: data.reason,
      created_by: userId
    });
    const returnRatio = returned.div(decimal(line.quantity));
    const returnSubtotal = decimal(line.subtotal_amount).mul(returnRatio);
    const returnVat = decimal(line.vat_amount).mul(returnRatio);
    const returnValue = returnSubtotal.plus(returnVat);
    const returnDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' });
    const invoice = await model.findIssuedInvoiceForDispatchCustomer(connection, line.dispatch_customer_id);
    await model.createReturnCreditNote(connection, {
      store_id: dispatch.store_id,
      dispatch_return_id: returnId,
      dispatch_request_id: dispatch.id,
      dispatch_customer_id: line.dispatch_customer_id,
      invoice_id: invoice?.id || null,
      customer_id: line.customer_id,
      credit_note_number: createDocumentNumber('CRN'),
      credit_note_date: returnDate,
      subtotal_amount: toMoney(returnSubtotal),
      vat_amount: toMoney(returnVat),
      total_amount: toMoney(returnValue),
      created_by: userId
    });

    if (dispatch.status === 'completed' && returnValue.gt(0)) {
      const returnCustomer = await model.findDispatchCustomerById(line.dispatch_customer_id, connection);
      if (returnCustomer?.sublocation_id) {
        await targetCollections.recordCollection(connection, {
          storeId: dispatch.store_id,
          salesmanId: dispatch.salesman_id,
          sublocationId: returnCustomer.sublocation_id,
          dispatchCustomerId: line.dispatch_customer_id,
          sourceType: 'return_adjustment',
          sourceId: returnId,
          amount: returnValue.negated(),
          collectionDate: returnDate,
          notes: `Return adjustment from ${dispatch.dispatch_number}`
        });
      }
    }

    // A return recorded after finance has posted the closeout first reduces
    // the customer's still-open debt. Any excess becomes a customer credit
    // (refund/next-order credit), preserving the original debt history.
    if (dispatch.status === 'completed' && returnValue.gt(0)) {
      let unappliedReturn = returnValue;
      const [openDebts] = await connection.execute(
        `SELECT * FROM customer_debts
         WHERE dispatch_customer_id = ? AND store_id = ?
           AND status IN ('pending', 'partially_paid') AND remaining_amount > 0
         ORDER BY debt_date ASC, id ASC FOR UPDATE`,
        [line.dispatch_customer_id, dispatch.store_id]
      );
      for (const debt of openDebts) {
        if (unappliedReturn.lte(0)) break;
        const reduction = decimal(debt.remaining_amount).lt(unappliedReturn)
          ? decimal(debt.remaining_amount)
          : unappliedReturn;
        const remainingDebt = decimal(debt.remaining_amount).minus(reduction);
        await connection.execute(
          `INSERT INTO customer_debt_adjustments (
            store_id, customer_debt_id, dispatch_request_id, adjustment_date,
            adjustment_type, amount, reason, created_by
          ) VALUES (?, ?, ?, ?, 'decrease', ?, ?, ?)`,
          [
            dispatch.store_id, debt.id, dispatch.id,
            returnDate, toMoney(reduction),
            `Return from dispatch ${dispatch.dispatch_number}`,
            userId
          ]
        );
        await connection.execute(
          `UPDATE customer_debts
           SET remaining_amount = ?, status = ?, notes = CONCAT_WS('\n', notes, ?)
           WHERE id = ?`,
          [
            toMoney(remainingDebt),
            remainingDebt.eq(0) ? 'paid' : 'partially_paid',
            `Return adjustment ${toMoney(reduction)} from dispatch ${dispatch.dispatch_number}`,
            debt.id
          ]
        );
        unappliedReturn = unappliedReturn.minus(reduction);
      }
      if (unappliedReturn.gt(0)) {
        await connection.execute(
          `INSERT INTO customer_credits (
            store_id, customer_id, credit_number, credit_date, original_amount,
            used_amount, remaining_amount, status, reference_type, reference_id, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, 0, ?, 'available', 'dispatch_return', ?, ?, ?)`,
          [
            dispatch.store_id, line.customer_id, createDocumentNumber('CRD'),
            returnDate, toMoney(unappliedReturn), toMoney(unappliedReturn),
            dispatch.id, `Return credit from dispatch ${dispatch.dispatch_number}`, userId
          ]
        );
      }
      // Posted closeouts are immutable. Record the return as its own receipt
      // instead of rewriting the original settlement or sales receipt.
      await paymentsModel.createReceipt(connection, {
        store_id: dispatch.store_id,
        receipt_number: createDocumentNumber('RCP'),
        customer_id: line.customer_id,
        dispatch_request_id: dispatch.id,
        dispatch_customer_id: line.dispatch_customer_id,
        receipt_date: returnDate,
        subtotal_amount: toMoney(returnSubtotal),
        vat_amount: toMoney(returnVat),
        total_amount: toMoney(returnValue),
        paid_amount: 0,
        remaining_amount: toMoney(unappliedReturn),
        receipt_type: 'other',
        created_by: userId
      });
      await connection.execute(
        `UPDATE dispatch_customers
         SET debt_amount = GREATEST(debt_amount - ?, 0)
         WHERE id = ?`,
        [toMoney(returnValue), line.dispatch_customer_id]
      );
      await connection.execute(
        `UPDATE delivery_target_credits
         SET eligible_amount = GREATEST(eligible_amount - ?, 0),
             status = CASE WHEN eligible_amount <= ? THEN 'cancelled' ELSE status END
         WHERE dispatch_customer_id = ? AND store_id = ? AND status IN ('pending', 'earned')`,
        [toMoney(returnValue), toMoney(returnValue), line.dispatch_customer_id, dispatch.store_id]
      );
    }
    const customerItems = await model.getDispatchItems(dispatch.id, connection);
    const customerLines = customerItems.filter((i) => Number(i.dispatch_customer_id) === Number(line.dispatch_customer_id));
    const totalOrdered = customerLines.reduce((sum, item) => sum.plus(item.quantity), decimal(0));
    const totalReturned = customerLines.reduce((sum, item) => sum.plus(item.returned_quantity), decimal(0));
    let newFulfillmentStatus = 'out_for_delivery';
    if (totalReturned.gte(totalOrdered)) {
      newFulfillmentStatus = 'returned';
    } else if (totalReturned.gt(0)) {
      newFulfillmentStatus = 'partial';
    }
    await model.updateDispatchCustomer(line.dispatch_customer_id, { fulfillment_status: newFulfillmentStatus }, connection);
  });
  return getDispatchRequest(dispatchId, actor);
}

function assertSalesmanCloseoutAccess(dispatch, actor) {
  if (actor.is_superadmin) return;
  if (Number(dispatch.salesman_user_id) !== Number(actor.id)) {
    throw ApiError.forbidden('Only the assigned salesman may submit this delivery closeout');
  }
}

async function createCloseout(dispatchId, data, userId, actor = {}) {
  const dispatchForAccess = await model.findDispatchRequestById(dispatchId);
  assertRowInScope(dispatchForAccess, actor, 'Dispatch request not found');
  if (!hasCloseoutAuthority(actor)) {
    throw ApiError.forbidden('You do not have permission to submit a delivery closeout');
  }
  if (!['delivery', 'partially_settled'].includes(dispatchForAccess.status)) throw ApiError.conflict('Closeout requires a delivery');
  return withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, dispatchId);
    const checklist = await model.getDocumentChecklist(dispatchId, dispatch.revision, connection);
    if (!checklist.delivery_documents_generated) {
      throw ApiError.conflict('Generate the combined delivery receipt and consent PDF for every customer before closing this delivery');
    }
    const [existing] = await connection.execute(
      `SELECT id FROM dispatch_settlements WHERE dispatch_request_id = ? AND status = 'draft' LIMIT 1 FOR UPDATE`,
      [dispatchId]
    );
    if (existing.length) throw ApiError.conflict('A draft closeout already exists for this dispatch');
    const [customers, items] = await Promise.all([
      model.getDispatchCustomers(dispatchId, connection),
      model.getDispatchItems(dispatchId, connection)
    ]);
    const submitted = new Map((data.customers || []).map((entry) => [Number(entry.dispatch_customer_id), entry]));
    const settlementRows = customers.map((customer) => {
      const entry = submitted.get(Number(customer.id)) || {};
      const collected = decimal(entry.collected_amount || 0);
      // Older persisted batches may not have item rows loaded by a caller
      // during a compatibility path; their stored total remains authoritative.
      const expected = Array.isArray(items) && items.length
        ? netCustomerAmount(customer.id, items)
        : decimal(customer.customer_total_amount || 0);
      if (collected.lt(0) || collected.gt(expected)) {
        throw ApiError.badRequest('Validation failed', [{ field: 'customers', message: 'Collected amount must be between zero and customer total' }]);
      }
      const debt = expected.minus(collected);
      return {
        customer,
        expected,
        collected,
        debt,
        status: debt.eq(0) ? 'paid' : collected.eq(0) ? 'debt' : 'partial_debt',
        notes: entry.notes
      };
    });
    const totalExpected = settlementRows.reduce((total, row) => total.plus(row.expected), decimal(0));
    const totalCollected = settlementRows.reduce((total, row) => total.plus(row.collected), decimal(0));
    const totalDebt = settlementRows.reduce((total, row) => total.plus(row.debt), decimal(0));
    const settlement = await model.createSettlement(connection, {
      store_id: dispatch.store_id,
      dispatch_request_id: dispatchId,
      settlement_number: data.settlement_number || createDocumentNumber('SET'),
      settlement_date: data.settlement_date,
      total_expected: toMoney(totalExpected),
      total_collected: toMoney(totalCollected),
      total_debt: toMoney(totalDebt),
      total_returned_value: 0,
      notes: data.notes
    });
    for (const row of settlementRows) {
      await connection.execute(
        `INSERT INTO dispatch_settlement_customers (
          dispatch_settlement_id, dispatch_customer_id, customer_id, expected_amount,
          collected_amount, debt_amount, settlement_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          settlement.id, row.customer.id, row.customer.customer_id, toMoney(row.expected),
          toMoney(row.collected), toMoney(row.debt), row.status, row.notes || null
        ]
      );
    }
    await connection.execute(
      `UPDATE dispatch_requests SET lifecycle_status = 'closeout_pending' WHERE id = ?`,
      [dispatchId]
    );
    return settlement;
  });
}

async function postSettlement(settlementId, data, userId, actor = {}) {
  return withTransaction(async (connection) => {
    const settlement = await model.findSettlementById(settlementId, connection);
    assertRowInScope(settlement, actor, 'Settlement not found');
    if (settlement.status !== 'draft') throw ApiError.conflict('Only draft closeouts can be posted');
    const dispatch = await model.lockDispatchRequest(connection, settlement.dispatch_request_id);
    const [rows] = await connection.execute(
      `SELECT * FROM dispatch_settlement_customers WHERE dispatch_settlement_id = ? FOR UPDATE`,
      [settlementId]
    );
    const totalCollected = rows.reduce((total, row) => total.plus(row.collected_amount), decimal(0));
    const totalDebt = rows.reduce((total, row) => total.plus(row.debt_amount), decimal(0));
    const cashAccountId = data.cash_account_id || null;
    if (totalCollected.gt(0) && !cashAccountId) {
      throw ApiError.badRequest('Validation failed', [{ field: 'cash_account_id', message: 'An incoming cash account is required when money is collected' }]);
    }
    if (totalCollected.gt(0)) {
      await accountingModel.createFinancialTransaction(connection, {
        store_id: dispatch.store_id,
        cash_account_id: cashAccountId,
        transaction_date: data.settlement_date || settlement.settlement_date,
        transaction_type: 'dispatch_settlement',
        direction: 'in',
        amount: toMoney(totalCollected),
        reference_type: 'dispatch_settlement',
        reference_id: settlementId,
        description: `Settlement for ${dispatch.dispatch_number}`,
        created_by: userId
      });
    }
    for (const row of rows) {
      const collectedAmount = decimal(row.collected_amount);
      const expectedAmount = decimal(row.expected_amount);
      const debtAmount = decimal(row.debt_amount);
      const paymentId = collectedAmount.gt(0)
        ? await paymentsModel.createPayment(connection, {
          store_id: dispatch.store_id,
          customer_id: row.customer_id,
          cash_account_id: cashAccountId,
          payment_number: createDocumentNumber('PAY'),
          payment_date: data.settlement_date || settlement.settlement_date,
          amount: toMoney(collectedAmount),
          payment_method: 'cash',
          reference_number: settlement.settlement_number,
          collected_by_salesman_id: dispatch.salesman_id,
          notes: `Collection from delivery ${dispatch.dispatch_number}`,
          created_by: userId
        })
        : null;

      await paymentsModel.createReceipt(connection, {
        store_id: dispatch.store_id,
        receipt_number: createDocumentNumber('RCP'),
        customer_id: row.customer_id,
        dispatch_request_id: dispatch.id,
        dispatch_customer_id: row.dispatch_customer_id,
        customer_payment_id: paymentId,
        receipt_date: data.settlement_date || settlement.settlement_date,
        total_amount: toMoney(expectedAmount),
        paid_amount: toMoney(collectedAmount),
        remaining_amount: toMoney(debtAmount),
        receipt_type: 'sale',
        created_by: userId
      });

      const currentCustomer = await model.findDispatchCustomerById(row.dispatch_customer_id, connection);
      if (collectedAmount.gt(0) && currentCustomer?.sublocation_id) {
        await targetCollections.recordCollection(connection, {
          storeId: dispatch.store_id,
          salesmanId: dispatch.salesman_id,
          sublocationId: currentCustomer.sublocation_id,
          dispatchCustomerId: row.dispatch_customer_id,
          sourceType: 'settlement_customer',
          sourceId: row.id,
          amount: collectedAmount,
          collectionDate: data.settlement_date || settlement.settlement_date,
          notes: `Delivery settlement ${settlement.settlement_number}`
        });
      }
      const currentFulfillment = currentCustomer ? currentCustomer.fulfillment_status : 'out_for_delivery';
      const targetFulfillment = ['returned', 'partial', 'failed', 'cancelled'].includes(currentFulfillment)
        ? currentFulfillment
        : 'delivered';
      await model.updateDispatchCustomer(row.dispatch_customer_id, {
        collected_amount: row.collected_amount,
        debt_amount: row.debt_amount,
        payment_status: row.settlement_status,
        fulfillment_status: targetFulfillment
      }, connection);
      if (decimal(row.debt_amount).gt(0)) {
        const gross = splitGrossAmount(row.debt_amount, await model.findDispatchCustomerById(row.dispatch_customer_id, connection));
        await connection.execute(
          `INSERT INTO customer_debts (
            store_id, customer_id, dispatch_request_id, dispatch_customer_id, debt_number, debt_date,
            subtotal_amount, vat_amount, original_amount, paid_amount, remaining_amount, status, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [
            dispatch.store_id, row.customer_id, dispatch.id, row.dispatch_customer_id,
            createDocumentNumber('DEBT'), data.settlement_date || settlement.settlement_date,
            gross.subtotal_amount, gross.vat_amount, row.debt_amount, row.debt_amount,
            row.settlement_status === 'partial_debt' ? 'partially_paid' : 'pending',
            `Debt created from settlement ${settlement.settlement_number}`, userId
          ]
        );
      }
      await model.createTargetCreditRecord({
        store_id: dispatch.store_id,
        dispatch_request_id: dispatch.id,
        dispatch_customer_id: row.dispatch_customer_id,
        salesman_id: dispatch.salesman_id,
        customer_id: row.customer_id,
        eligible_amount: row.expected_amount,
        reference_date: data.settlement_date || settlement.settlement_date,
        delivery_date: dispatch.dispatched_at ? new Date(dispatch.dispatched_at).toISOString().slice(0, 10) : null,
        status: decimal(row.debt_amount).eq(0) ? 'earned' : 'pending'
      }, connection);
    }
    await connection.execute(
      `UPDATE dispatch_settlements
       SET cash_account_id = ?, total_collected = ?, total_debt = ?, status = 'posted', settled_by = ?,
           posted_at = NOW(), posted_at_is_estimated = 0
       WHERE id = ?`,
      [cashAccountId, toMoney(totalCollected), toMoney(totalDebt), userId, settlementId]
    );
    await model.updateDispatchRequest(dispatch.id, {
      status: 'completed',
      total_collected: toMoney(totalCollected),
      total_debt: toMoney(totalDebt),
      completed_by: userId,
      completed_at: new Date()
    }, connection);
    await accountingModel.createSalesmanBalance(connection, {
      store_id: dispatch.store_id,
      salesman_id: dispatch.salesman_id,
      dispatch_request_id: dispatch.id,
      balance_date: data.settlement_date || settlement.settlement_date,
      expected_amount: settlement.total_expected,
      collected_amount: toMoney(totalCollected),
      debt_amount: toMoney(totalDebt),
      returned_stock_value: 0,
      status: 'open',
      notes: settlement.notes
    });
    return model.findSettlementById(settlementId, connection);
  });
}

async function listSettlements(dispatchId, actor = {}) {
  const dispatch = await model.findDispatchRequestById(dispatchId);
  assertDispatchReadScope(dispatch, actor, 'Dispatch request not found');
  return model.listSettlementsByDispatch(dispatchId);
}

async function getSettlement(id, actor = {}) {
  const settlement = await model.findSettlementById(id);
  return assertDispatchReadScope(settlement, actor, 'Settlement not found');
}

async function reopenCloseout(settlementId, actor = {}) {
  return withTransaction(async (connection) => {
    const settlement = await model.findSettlementById(settlementId, connection);
    assertRowInScope(settlement, actor, 'Settlement not found');
    if (!hasCloseoutAuthority(actor)) {
      throw ApiError.forbidden('You do not have permission to reopen this delivery closeout');
    }
    if (settlement.status !== 'draft') throw ApiError.conflict('Only a draft closeout can be reopened');
    const dispatch = await model.lockDispatchRequest(connection, settlement.dispatch_request_id);
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    const deleted = await model.deleteDraftSettlement(connection, settlement.id);
    if (!deleted) throw ApiError.conflict('The draft closeout no longer exists');
    await model.updateDispatchRequest(dispatch.id, { lifecycle_status: 'out_for_delivery' }, connection);
    return getDispatchRequest(dispatch.id, actor, connection);
  });
}

async function recordDocumentGeneration(dispatchId, documentType, data, userId, actor = {}) {
  return withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, dispatchId);
    assertDispatchReadScope(dispatch, actor, 'Dispatch request not found');
    const allowedStatuses = documentType === 'customer_table'
      ? ['approved', 'delivery', 'partially_settled', 'completed']
      : documentType === 'invoice'
        ? ['pending_approval', 'approved', 'delivery', 'partially_settled', 'completed']
        : ['delivery', 'partially_settled', 'completed'];
    if (!allowedStatuses.includes(dispatch.status)) {
      throw ApiError.conflict('This document is not available at the current workflow stage');
    }
    let invoice = null;
    let customer = null;
    if (documentType === 'invoice') {
      invoice = await model.getInvoiceById(data.invoice_id, connection);
      if (!invoice || Number(invoice.dispatch_request_id) !== Number(dispatchId) || Number(invoice.revision) !== Number(dispatch.revision) || invoice.status !== 'issued') {
        throw ApiError.conflict('A current issued invoice is required for document generation');
      }
    } else if (['customer_receipt', 'customer_acceptance_consent'].includes(documentType)) {
      const customers = await model.getDispatchCustomers(dispatchId, connection);
      customer = customers.find((c) => Number(c.id) === Number(data.customer_id));
      if (!customer) throw ApiError.notFound('Dispatch customer not found');
    }
    const filename = documentType === 'invoice'
      ? `invoice-${invoice.invoice_number}.pdf`
      : documentType === 'customer_receipt'
      ? `receipt-${customer.id}.pdf`
      : documentType === 'customer_acceptance_consent'
      ? `acceptance-consent-${customer.id}.pdf`
      : `dispatch-${dispatch.dispatch_number}-${documentType}.pdf`;
    await model.createDocumentGeneration(connection, {
      store_id: dispatch.store_id,
      dispatch_request_id: dispatch.id,
      dispatch_customer_id: invoice?.dispatch_customer_id || customer?.id || null,
      invoice_id: invoice?.id || null,
      document_type: documentType,
      revision: dispatch.revision,
      generated_by: userId,
      file_name: filename
    });
    return { dispatch, invoice, customer, filename };
  });
}

async function recordDeliveryDocumentGeneration(dispatchId, customerId, userId, actor = {}) {
  return withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, dispatchId);
    assertDispatchReadScope(dispatch, actor, 'Dispatch request not found');
    if (!['delivery', 'partially_settled', 'completed'].includes(dispatch.status)) {
      throw ApiError.conflict('Delivery documents are available after delivery is issued');
    }
    const customers = await model.getDispatchCustomers(dispatchId, connection);
    const customer = customers.find((entry) => Number(entry.id) === Number(customerId));
    if (!customer) throw ApiError.notFound('Dispatch customer not found');
    const filename = `delivery-document-${customer.id}.pdf`;
    const common = {
      store_id: dispatch.store_id,
      dispatch_request_id: dispatch.id,
      dispatch_customer_id: customer.id,
      revision: dispatch.revision,
      generated_by: userId,
      file_name: filename
    };
    // Both audit rows point to this one file: page 1 is the receipt and page
    // 2 is the signed acceptance and consent page.
    await model.createDocumentGeneration(connection, { ...common, document_type: 'customer_receipt' });
    await model.createDocumentGeneration(connection, { ...common, document_type: 'customer_acceptance_consent' });
    return { dispatch, customer, filename };
  });
}

async function getInvoice(id, actor = {}) {
  const invoice = await model.getInvoiceById(id);
  assertDispatchReadScope(invoice, actor, 'Invoice not found');
  return { ...invoice, lines: await model.getInvoiceLines(id) };
}

async function getReturnCreditNote(id, actor = {}) {
  const creditNote = await model.getReturnCreditNoteById(id);
  assertDispatchReadScope(creditNote, actor, 'Return credit note not found');
  return creditNote;
}

module.exports = {
  addCustomer,
  addItem,
  approveDispatch,
  cancelDispatch,
  createCloseout,
  createDispatchRequest,
  createReturn,
  deleteItem,
  dispatchStock,
  getDispatchRequest,
  getInvoice,
  getReturnCreditNote,
  getSettlement,
  listDispatchRequests: async (input, actor = {}) => {
    const result = await model.listDispatchRequests(await salespersonScopedQuery(input, actor));
    result.rows = result.rows.map((row) => ({
      ...row,
      batch_id: row.id,
      origin: row.origin || 'direct',
      lifecycle_status: row.lifecycle_status || mapStatusToLifecycle(row.status),
      assigned_salesman: {
        id: row.salesman_id,
        name: row.salesman_name
      },
      warehouse: {
        id: row.warehouse_id,
        name: row.warehouse_name
      },
      capabilities: getBatchCapabilities(row, actor)
    }));
    return result;
  },
  listInvoices: async (input, actor = {}) => model.listInvoices(await salespersonScopedQuery(input, actor)),
  listSettlements,
  postSettlement,
  recordDeliveryDocumentGeneration,
  recordDocumentGeneration,
  reopenCloseout,
  reworkDispatch,
  submitDispatch,
  updateItem,
  updateDispatchRequest,
  _private: {
    allocateDispatchLine,
    calculateGross: splitGrossAmount,
    consumeReadyAllocation,
    releaseReservations
  }
};
