const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const inventoryModel = require('../inventory/inventory.model');
const stockService = require('../inventory/stock.service');
const locationModel = require('../locations/locations.model');
const customerModel = require('../customers/customers.model');
const accountingModel = require('../accounting/accounting.model');
const packagingService = require('../packaging/packaging.service');
const packagingModel = require('../packaging/packaging.model');
const posService = require('../pos/pos.service');
const storeConfigService = require('../../services/storeConfig.service');
const model = require('./dispatch.model');

const WHOLE_QUANTITY_FULFILLMENTS = new Set([
  'normal_carton',
  'normal_loose_unit',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);
const NORMAL_FULFILLMENTS = new Set([
  'normal_carton',
  'normal_loose_unit',
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

function isSalesmanWorkspaceOnly(actor = {}) {
  if (actor.is_superadmin || !hasPermission(actor, 'salesman_workspace.view')) return false;
  return ![...FULL_DISPATCH_READ_PERMISSIONS].some((permission) => hasPermission(actor, permission));
}

function assertDispatchReadScope(dispatch, actor = {}, message = 'Dispatch request not found') {
  assertRowInScope(dispatch, actor, message);
  if (isSalesmanWorkspaceOnly(actor) && Number(dispatch.salesman_user_id) !== Number(actor.id)) {
    throw ApiError.notFound(message);
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

async function getDispatchRequest(id, actor = {}) {
  const dispatch = await model.findDispatchRequestById(id);
  assertDispatchReadScope(dispatch, actor, 'Dispatch request not found');
  const [customers, items, invoices, documentChecklist] = await Promise.all([
    model.getDispatchCustomers(id),
    model.getDispatchItems(id),
    model.getInvoicesForDispatch(id),
    model.getDocumentChecklist(id, dispatch.revision)
  ]);
  const allocationCost = items.reduce((total, item) => total.plus(item.allocated_total_cost || 0), decimal(0));
  const giftCost = items
    .filter((item) => item.line_type === 'free_gift')
    .reduce((total, item) => total.plus(item.allocated_total_cost || 0), decimal(0));
  return {
    ...dispatch,
    customers,
    items,
    invoices,
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
  return { salesman, warehouse };
}

async function createDispatchRequest(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  await validateSalesmanAndWarehouse(scoped, actor);
  return model.createDispatchRequest({
    ...scoped,
    dispatch_number: scoped.dispatch_number || createDocumentNumber('DISP'),
    created_by: userId
  });
}

async function createDispatchFromPos(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const preparation = await posService.prepareSelectedOrders(scoped, actor);
  if (!preparation.can_convert || !preparation.dispatch_payload) {
    throw ApiError.conflict('Selected POS orders cannot be converted because gifts need review or stock is unavailable');
  }
  await validateSalesmanAndWarehouse({
    store_id: preparation.store_id,
    salesman_id: preparation.salesman_id,
    warehouse_id: preparation.warehouse_id
  }, actor);
  const dispatchId = await withTransaction(async (connection) => {
    const dispatch = await model.createDispatchRequest({
      store_id: preparation.store_id,
      dispatch_number: scoped.dispatch_number || createDocumentNumber('DISP'),
      salesman_id: preparation.salesman_id,
      warehouse_id: preparation.warehouse_id,
      request_date: scoped.request_date || new Date().toISOString().slice(0, 10),
      notes: scoped.notes,
      created_by: userId
    }, connection);
    for (const customerPayload of preparation.dispatch_payload.customers) {
      const dispatchCustomer = await model.createDispatchCustomer({
        store_id: dispatch.store_id,
        dispatch_request_id: dispatch.id,
        customer_id: customerPayload.customer_id,
        location_id: customerPayload.location_id,
        sublocation_id: customerPayload.sublocation_id,
        notes: `Created from POS orders: ${customerPayload.source_pos_order_ids.join(', ')}`
      }, connection);
      for (const line of customerPayload.lines) {
        const entry = await packagingModel.findSaleCatalogEntryById(line.sale_catalog_entry_id, connection);
        if (!entry || entry.status !== 'active') throw ApiError.conflict('A selected POS offer is no longer active');
        const lineQuantity = decimal(line.quantity);
        const unitPrice = line.line_type === 'free_gift' ? decimal(0) : decimal(line.unit_price);
        const vatRate = line.line_type === 'free_gift' ? decimal(0) : decimal(line.vat_rate || 0);
        const subtotal = lineQuantity.mul(unitPrice);
        const vatAmount = subtotal.mul(vatRate).div(100);
        await model.createDispatchItem({
          store_id: dispatch.store_id,
          dispatch_customer_id: dispatchCustomer.id,
          dispatch_request_id: dispatch.id,
          sale_catalog_entry_id: entry.id,
          item_id: entry.item_id || null,
          packaging_group_id: entry.packaging_group_id || null,
          line_type: line.line_type,
          fulfillment_type: line.fulfillment_type,
          quantity: toMoney(lineQuantity),
          unit_price: toMoney(unitPrice),
          unit_cost: 0,
          subtotal_amount: toMoney(subtotal),
          vat_rate: toMoney(vatRate),
          vat_amount: toMoney(vatAmount),
          line_total: toMoney(subtotal.plus(vatAmount)),
          item_name_snapshot: catalogLineName(entry),
          unit_label_snapshot: entry.unit_label || 'unit'
        }, connection);
      }
    }
    await model.recalculateDispatchTotals(connection, dispatch.id);
    await posService.convertSelectedOrdersToDispatch(connection, {
      dispatch_request_id: dispatch.id,
      pos_order_ids: scoped.pos_order_ids,
      gift_decisions: scoped.gift_decisions,
      store_id: preparation.store_id
    }, actor);
    return dispatch.id;
  });
  return getDispatchRequest(dispatchId, actor);
}

async function updateDispatchRequest(id, data, actor = {}) {
  const dispatch = await model.findDispatchRequestById(id);
  assertRowInScope(dispatch, actor, 'Dispatch request not found');
  if (dispatch.status !== 'draft') throw ApiError.conflict('Only draft dispatches can be edited');
  const { store_id, salesman_id, warehouse_id, ...updates } = data;
  if (salesman_id || warehouse_id) {
    await validateSalesmanAndWarehouse({
      store_id: dispatch.store_id,
      salesman_id: salesman_id || dispatch.salesman_id,
      warehouse_id: warehouse_id || dispatch.warehouse_id
    }, actor);
    if (salesman_id) updates.salesman_id = salesman_id;
    if (warehouse_id) updates.warehouse_id = warehouse_id;
  }
  return model.updateDispatchRequest(id, updates);
}

async function addCustomer(dispatchId, data, actor = {}) {
  const dispatch = await model.findDispatchRequestById(dispatchId);
  assertRowInScope(dispatch, actor, 'Dispatch request not found');
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
  assertRowInScope(dispatchCustomer, actor, 'Dispatch customer not found');
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
    assertRowInScope(existing, actor, 'Dispatch line not found');
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
    assertRowInScope(existing, actor, 'Dispatch line not found');
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
  const inventoryQuantity = cartonCount.mul(item.kg_per_carton);
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
    const qtyKg = allocated.mul(item.kg_per_carton);
    const allocationCost = qtyKg.mul(unitCost);
    await createAllocation(connection, dispatch, line, {
      item_id: item.id,
      carton_stock_lot_id: lot.id,
      allocation_type: 'carton_lot',
      allocated_quantity: toMoney(allocated),
      inventory_quantity: toMoney(qtyKg),
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
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (dispatch.status !== 'pending_approval') throw ApiError.conflict('Only submitted dispatches can be approved');
    const checklist = await model.getDocumentChecklist(id, dispatch.revision, connection);
    if (!checklist.ready_for_approval) {
      throw ApiError.conflict('Generate the customer table, quantity-only table, and every current invoice before approval');
    }
    const [customers, lines] = await Promise.all([
      model.getDispatchCustomers(id, connection),
      model.getDispatchItems(id, connection)
    ]);
    ensureDispatchContent(customers, lines);
    for (const line of lines) await allocateDispatchLine(connection, dispatch, line, userId);
    await model.updateDispatchRequest(id, { status: 'approved', approved_by: userId, approved_at: new Date() }, connection);
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
    if (allocated.ne(1) || container.status !== 'full' || beforeInner.ne(container.initial_inner_quantity)) {
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
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (dispatch.status !== 'approved') throw ApiError.conflict('Only approved dispatches can be physically dispatched');
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
    await model.updateDispatchRequest(id, { status: 'dispatched', dispatched_by: userId, dispatched_at: new Date() }, connection);
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
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
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
  });
  return getDispatchRequest(id, actor);
}

async function cancelDispatch(id, actor = {}) {
  await withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, id);
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (['dispatched', 'partially_settled', 'completed'].includes(dispatch.status)) {
      throw ApiError.conflict('A dispatched or settled dispatch cannot be cancelled');
    }
    if (dispatch.status === 'approved') await releaseReservations(connection, dispatch, actor.id, 'Release reservation for cancelled dispatch');
    if (['pending_approval', 'approved'].includes(dispatch.status)) {
      await model.voidInvoicesForDispatchRevision(connection, id, dispatch.revision, actor.id, 'Dispatch cancelled');
    }
    await model.updateDispatchRequest(id, { status: 'cancelled', cancelled_by: actor.id, cancelled_at: new Date() }, connection);
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
    if (!['dispatched', 'partially_settled'].includes(dispatch.status)) throw ApiError.conflict('Returns require a dispatched request');
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
    await model.createDispatchReturn(connection, {
      store_id: dispatch.store_id,
      dispatch_request_id: dispatch.id,
      dispatch_item_id: line.id,
      returned_quantity: toMoney(returned),
      reason: data.reason,
      created_by: userId
    });
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
  assertSalesmanCloseoutAccess(dispatchForAccess, actor);
  if (!['dispatched', 'partially_settled'].includes(dispatchForAccess.status)) throw ApiError.conflict('Closeout requires a dispatched request');
  return withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, dispatchId);
    const [existing] = await connection.execute(
      `SELECT id FROM dispatch_settlements WHERE dispatch_request_id = ? AND status = 'draft' LIMIT 1 FOR UPDATE`,
      [dispatchId]
    );
    if (existing.length) throw ApiError.conflict('A draft closeout already exists for this dispatch');
    const customers = await model.getDispatchCustomers(dispatchId, connection);
    const submitted = new Map((data.customers || []).map((entry) => [Number(entry.dispatch_customer_id), entry]));
    const settlementRows = customers.map((customer) => {
      const entry = submitted.get(Number(customer.id)) || {};
      const collected = decimal(entry.collected_amount || 0);
      if (collected.lt(0) || collected.gt(customer.customer_total_amount)) {
        throw ApiError.badRequest('Validation failed', [{ field: 'customers', message: 'Collected amount must be between zero and customer total' }]);
      }
      const debt = decimal(customer.customer_total_amount).minus(collected);
      return {
        customer,
        collected,
        debt,
        status: debt.eq(0) ? 'paid' : collected.eq(0) ? 'debt' : 'partial_debt',
        notes: entry.notes
      };
    });
    const totalExpected = settlementRows.reduce((total, row) => total.plus(row.customer.customer_total_amount), decimal(0));
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
          settlement.id, row.customer.id, row.customer.customer_id, row.customer.customer_total_amount,
          toMoney(row.collected), toMoney(row.debt), row.status, row.notes || null
        ]
      );
    }
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
      await model.updateDispatchCustomer(row.dispatch_customer_id, {
        collected_amount: row.collected_amount,
        debt_amount: row.debt_amount,
        payment_status: row.settlement_status
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
    }
    await connection.execute(
      `UPDATE dispatch_settlements
       SET cash_account_id = ?, total_collected = ?, total_debt = ?, status = 'posted', settled_by = ?
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

async function recordDocumentGeneration(dispatchId, documentType, data, userId, actor = {}) {
  return withTransaction(async (connection) => {
    const dispatch = await model.lockDispatchRequest(connection, dispatchId);
    assertRowInScope(dispatch, actor, 'Dispatch request not found');
    if (!['pending_approval', 'approved', 'dispatched', 'partially_settled', 'completed'].includes(dispatch.status)) {
      throw ApiError.conflict('Documents are available after dispatch submission');
    }
    let invoice = null;
    if (documentType === 'invoice') {
      invoice = await model.getInvoiceById(data.invoice_id, connection);
      if (!invoice || Number(invoice.dispatch_request_id) !== Number(dispatchId) || Number(invoice.revision) !== Number(dispatch.revision) || invoice.status !== 'issued') {
        throw ApiError.conflict('A current issued invoice is required for document generation');
      }
    }
    const filename = documentType === 'invoice'
      ? `invoice-${invoice.invoice_number}.pdf`
      : `dispatch-${dispatch.dispatch_number}-${documentType}.pdf`;
    await model.createDocumentGeneration(connection, {
      store_id: dispatch.store_id,
      dispatch_request_id: dispatch.id,
      dispatch_customer_id: invoice?.dispatch_customer_id || null,
      invoice_id: invoice?.id || null,
      document_type: documentType,
      revision: dispatch.revision,
      generated_by: userId,
      file_name: filename
    });
    return { dispatch, invoice, filename };
  });
}

async function getInvoice(id, actor = {}) {
  const invoice = await model.getInvoiceById(id);
  assertDispatchReadScope(invoice, actor, 'Invoice not found');
  return { ...invoice, lines: await model.getInvoiceLines(id) };
}

module.exports = {
  addCustomer,
  addItem,
  approveDispatch,
  cancelDispatch,
  createCloseout,
  createDispatchFromPos,
  createDispatchRequest,
  createReturn,
  deleteItem,
  dispatchStock,
  getDispatchRequest,
  getInvoice,
  getSettlement,
  listDispatchRequests: async (input, actor = {}) => model.listDispatchRequests(await salespersonScopedQuery(input, actor)),
  listInvoices: async (input, actor = {}) => model.listInvoices(await salespersonScopedQuery(input, actor)),
  listSettlements,
  postSettlement,
  recordDocumentGeneration,
  reworkDispatch,
  submitDispatch,
  updateItem,
  updateDispatchRequest,
  _private: {
    allocateDispatchLine,
    calculateGross: splitGrossAmount,
    releaseReservations
  }
};
