const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { resolveStoreId } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const { query } = require('../../bootstrap/db');
const customerService = require('../customers/customers.service');
const model = require('./pos.model');

const POS_ENTRY_TYPES = new Set([
  'normal_carton',
  'normal_loose_unit',
  'normal_weight',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);

const WHOLE_QUANTITY_ENTRY_TYPES = new Set([
  'normal_carton',
  'normal_loose_unit',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);

function validationError(field, message) {
  return ApiError.badRequest('Validation failed', [{ field, message }]);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function hasPermission(actor = {}, permission) {
  if (actor.is_superadmin) return true;
  const permissions = new Set(actor.permissions || []);
  return permissions.has('*') || permissions.has(permission);
}

async function runQuery(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }

  return query(sql, params);
}

function assertStoreRow(row, storeId, field, message) {
  if (!row || Number(row.store_id) !== Number(storeId)) {
    throw validationError(field, message);
  }
  return row;
}

async function getLinkedSalesman(actor = {}, input = {}, connection = null) {
  const storeId = resolveStoreId(actor, input);
  const salesman = await model.findSalesmanByUserId(actor.id, storeId, connection);

  if (!salesman || salesman.status !== 'active') {
    throw ApiError.forbidden('Mini POS requires an active salesman account linked to the signed-in user');
  }

  return { storeId, salesman };
}

async function assertWarehouse(warehouseId, storeId, connection = null) {
  const warehouse = await model.findWarehouseById(warehouseId, connection);
  assertStoreRow(warehouse, storeId, 'warehouse_id', 'Warehouse does not belong to this store');
  if (warehouse.status !== 'active') {
    throw validationError('warehouse_id', 'Warehouse must be active');
  }
  return warehouse;
}

async function getTerritories(salesmanId, connection = null) {
  return model.listSalesmanTerritories(salesmanId, connection);
}

async function assertTerritory(salesmanId, locationId, sublocationId, connection = null) {
  const territories = await getTerritories(salesmanId, connection);
  const territory = territories.find((row) =>
    Number(row.location_id) === Number(locationId)
    && Number(row.sublocation_id) === Number(sublocationId)
  );

  if (!territory) {
    throw validationError(
      'sublocation_id',
      'The selected territory is not assigned to the signed-in salesman'
    );
  }
  return territory;
}

async function assertOrderCustomer(customerId, salesman, storeId, connection = null) {
  const customer = await model.findCustomerById(customerId, connection);
  assertStoreRow(customer, storeId, 'customer_id', 'Customer does not belong to this store');
  if (customer.status !== 'active') {
    throw validationError('customer_id', 'Customer must be active');
  }
  if (Number(customer.assigned_salesman_id) !== Number(salesman.id)) {
    throw validationError('customer_id', 'Customer is not assigned to the signed-in salesman');
  }

  await assertTerritory(salesman.id, customer.location_id, customer.sublocation_id, connection);
  return customer;
}

function validateOrderQuantity(quantity, entryType, field) {
  const value = decimal(quantity);
  if (!value.isFinite() || value.lte(0)) {
    throw validationError(field, 'Quantity must be greater than zero');
  }
  if (WHOLE_QUANTITY_ENTRY_TYPES.has(entryType) && !value.isInteger()) {
    throw validationError(field, 'This sale offer must use a whole quantity');
  }
  return value;
}

async function resolveOrderLines(lines, storeId, connection = null) {
  const resolved = [];
  for (const [index, inputLine] of lines.entries()) {
    const catalogEntry = await model.findSaleCatalogEntryById(
      inputLine.sale_catalog_entry_id,
      connection
    );
    assertStoreRow(
      catalogEntry,
      storeId,
      `lines.${index}.sale_catalog_entry_id`,
      'Sale offer does not belong to this store'
    );

    if (
      catalogEntry.status !== 'active'
      || !Number(catalogEntry.is_pos_active)
      || !POS_ENTRY_TYPES.has(catalogEntry.entry_type)
    ) {
      throw validationError(
        `lines.${index}.sale_catalog_entry_id`,
        'Sale offer is not active in Mini POS'
      );
    }
    if (catalogEntry.item_id && catalogEntry.item_status !== 'active') {
      throw validationError(
        `lines.${index}.sale_catalog_entry_id`,
        'The source item is inactive'
      );
    }
    if (catalogEntry.packaging_group_id && catalogEntry.packaging_group_status !== 'active') {
      throw validationError(
        `lines.${index}.sale_catalog_entry_id`,
        'The packaging group is inactive'
      );
    }

    const quantity = validateOrderQuantity(
      inputLine.quantity,
      catalogEntry.entry_type,
      `lines.${index}.quantity`
    );
    const lineType = inputLine.line_type || 'sale';

    resolved.push({
      sale_catalog_entry_id: Number(catalogEntry.id),
      item_id: catalogEntry.item_id ? Number(catalogEntry.item_id) : null,
      packaging_group_id: catalogEntry.packaging_group_id
        ? Number(catalogEntry.packaging_group_id)
        : null,
      line_type: lineType,
      fulfillment_type: catalogEntry.entry_type,
      quantity: toMoney(quantity),
      unit_price: lineType === 'free_gift' ? '0.0000' : toMoney(catalogEntry.default_price),
      vat_rate: toMoney(catalogEntry.vat_rate || 0),
      notes: inputLine.notes || null,
      catalog_entry: catalogEntry
    });
  }

  return resolved;
}

function serializeLine(line) {
  return {
    id: line.id ? Number(line.id) : undefined,
    sale_catalog_entry_id: Number(line.sale_catalog_entry_id),
    item_id: line.item_id ? Number(line.item_id) : null,
    packaging_group_id: line.packaging_group_id ? Number(line.packaging_group_id) : null,
    line_type: line.line_type,
    fulfillment_type: line.fulfillment_type,
    quantity: toMoney(line.quantity),
    unit_price: toMoney(line.unit_price || 0),
    vat_rate: toMoney(line.vat_rate || 0),
    notes: line.notes || null
  };
}

function serializeOrderSnapshot(order, lines) {
  return {
    order_number: order.order_number,
    salesman_id: Number(order.salesman_id),
    warehouse_id: Number(order.warehouse_id),
    customer_id: Number(order.customer_id),
    location_id: Number(order.location_id),
    sublocation_id: Number(order.sublocation_id),
    order_date: order.order_date,
    notes: order.notes || null,
    status: order.status,
    lines: lines.map(serializeLine)
  };
}

function calculateOrderTotals(lines) {
  let subtotal = decimal(0);
  let vat = decimal(0);
  let giftQuantity = decimal(0);
  for (const line of lines) {
    const quantity = decimal(line.quantity);
    if (line.line_type === 'free_gift') {
      giftQuantity = giftQuantity.plus(quantity);
      continue;
    }
    const lineSubtotal = quantity.mul(line.unit_price || 0);
    subtotal = subtotal.plus(lineSubtotal);
    vat = vat.plus(lineSubtotal.mul(line.vat_rate || 0).div(100));
  }
  return {
    subtotal_amount: toMoney(subtotal),
    vat_amount: toMoney(vat),
    total_amount: toMoney(subtotal.plus(vat)),
    gift_quantity: toMoney(giftQuantity)
  };
}

function assertGiftRequestPermission(lines, actor = {}) {
  if (lines.some((line) => line.line_type === 'free_gift') && !hasPermission(actor, 'pos.request_gifts')) {
    throw ApiError.forbidden('You do not have permission to request free gifts in Mini POS');
  }
}

async function normalAvailableBaseQuantity(itemId, warehouseId, connection = null) {
  const rows = await runQuery(
    connection,
    `SELECT COALESCE(quantity_on_hand - quantity_reserved, 0) AS quantity
     FROM item_stock_balances
     WHERE warehouse_id = ? AND item_id = ?
     LIMIT 1`,
    [warehouseId, itemId]
  );
  return decimal(rows[0]?.quantity || 0);
}

async function availableSealedCartons(itemId, warehouseId, connection = null) {
  const rows = await runQuery(
    connection,
    `SELECT COALESCE(SUM(GREATEST(
       FLOOR(l.remaining_cartons - COALESCE(reserved.reserved_inventory_quantity, 0) / l.kg_per_carton),
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
    [warehouseId, itemId]
  );
  return decimal(rows[0]?.quantity || 0);
}

async function readyContainerPool(packagingGroupId, warehouseId, connection = null) {
  return runQuery(
    connection,
    `SELECT c.id, c.status, c.initial_inner_quantity, c.remaining_inner_quantity, c.remaining_cost,
       COALESCE(reserved.reserved_outer, 0) AS reserved_outer,
       COALESCE(reserved.reserved_inner, 0) AS reserved_inner
     FROM ready_stock_containers c
     LEFT JOIN (
       SELECT dla.ready_stock_container_id,
         SUM(CASE WHEN di.fulfillment_type = 'ready_outer_carton' THEN dla.allocated_quantity ELSE 0 END) AS reserved_outer,
         SUM(CASE WHEN di.fulfillment_type = 'ready_inner_unit' THEN dla.allocated_quantity ELSE 0 END) AS reserved_inner
       FROM dispatch_line_allocations dla
       JOIN dispatch_items di ON di.id = dla.dispatch_item_id
       WHERE dla.status = 'reserved' AND dla.ready_stock_container_id IS NOT NULL
       GROUP BY dla.ready_stock_container_id
     ) reserved ON reserved.ready_stock_container_id = c.id
     WHERE c.warehouse_id = ?
       AND c.packaging_group_id = ?
       AND c.status IN ('full', 'partial')
     ORDER BY c.created_at ASC, c.id ASC`,
    [warehouseId, packagingGroupId]
  );
}

async function offerAvailability(entry, warehouseId, connection = null) {
  if (entry.entry_type === 'normal_carton') {
    return availableSealedCartons(entry.item_id, warehouseId, connection);
  }
  const normalTypes = new Set(['normal_loose_unit', 'normal_weight', 'normal_piece']);
  if (normalTypes.has(entry.entry_type)) {
    const available = await normalAvailableBaseQuantity(entry.item_id, warehouseId, connection);
    if (entry.entry_type !== 'normal_loose_unit') return available;
    const looseUnitWeight = decimal(entry.kg_per_carton || 0).div(entry.loose_units_per_carton || 1);
    return looseUnitWeight.eq(0) ? decimal(0) : available.div(looseUnitWeight).floor();
  }

  const containers = await readyContainerPool(entry.packaging_group_id, warehouseId, connection);
  if (entry.entry_type === 'ready_outer_carton') {
    return decimal(containers.filter((container) =>
      container.status === 'full'
      && decimal(container.remaining_inner_quantity).eq(container.initial_inner_quantity)
      && decimal(container.reserved_outer).eq(0)
      && decimal(container.reserved_inner).eq(0)
    ).length);
  }
  return containers.reduce((total, container) => {
    if (decimal(container.reserved_outer).gt(0)) return total;
    const available = decimal(container.remaining_inner_quantity).minus(container.reserved_inner);
    return total.plus(available.gt(0) ? available : 0);
  }, decimal(0));
}

function makeAvailabilityState(bucket, available) {
  const shortage = bucket.required.minus(available);
  return {
    sale_catalog_entry_id: Number(bucket.entry.id),
    display_name: bucket.entry.display_name || bucket.entry.catalog_display_name,
    unit_label: bucket.entry.unit_label || bucket.entry.catalog_unit_label,
    fulfillment_type: bucket.entry.entry_type || bucket.entry.fulfillment_type,
    required_quantity: toMoney(bucket.required),
    available_quantity: toMoney(available),
    shortage_quantity: toMoney(shortage.gt(0) ? shortage : 0),
    available: shortage.lte(0)
  };
}

async function assessLinesAvailability(lines, warehouseId, connection = null) {
  const byOffer = new Map();
  for (const line of lines) {
    const key = Number(line.sale_catalog_entry_id);
    let bucket = byOffer.get(key);
    if (!bucket) {
      const entry = line.catalog_entry || await model.findSaleCatalogEntryById(key, connection);
      bucket = { entry, lines: [], required: decimal(0) };
      byOffer.set(key, bucket);
    }
    bucket.lines.push(line);
    bucket.required = bucket.required.plus(line.quantity);
  }

  const states = new Map();

  // Carton and loose-unit offers draw from one canonical kilogram balance.
  // Simulate carton allocation first so a valid sealed-carton request cannot
  // be displaced by a loose-unit request in the same selected POS work.
  const normalByItem = new Map();
  const readyByGroup = new Map();
  for (const bucket of byOffer.values()) {
    if (String(bucket.entry.entry_type || '').startsWith('normal_')) {
      const itemId = Number(bucket.entry.item_id);
      if (!normalByItem.has(itemId)) normalByItem.set(itemId, []);
      normalByItem.get(itemId).push(bucket);
    } else {
      const groupId = Number(bucket.entry.packaging_group_id);
      if (!readyByGroup.has(groupId)) readyByGroup.set(groupId, []);
      readyByGroup.get(groupId).push(bucket);
    }
  }

  const normalOrder = { normal_carton: 0, normal_loose_unit: 1, normal_weight: 2, normal_piece: 2 };
  for (const buckets of normalByItem.values()) {
    buckets.sort((left, right) => normalOrder[left.entry.entry_type] - normalOrder[right.entry.entry_type]);
    let availableBase = await normalAvailableBaseQuantity(buckets[0].entry.item_id, warehouseId, connection);
    let availableCartons = await availableSealedCartons(buckets[0].entry.item_id, warehouseId, connection);
    for (const bucket of buckets) {
      const type = bucket.entry.entry_type;
      let availableInOfferUnit;
      let consumedBase;
      if (type === 'normal_carton') {
        const cartonKg = decimal(bucket.entry.kg_per_carton || 0);
        if (cartonKg.gt(0)) {
          const cartonsByBaseBalance = availableBase.div(cartonKg).floor();
          availableInOfferUnit = availableCartons.lte(cartonsByBaseBalance)
            ? availableCartons
            : cartonsByBaseBalance;
        } else {
          availableInOfferUnit = decimal(0);
        }
        const fulfilled = bucket.required.lte(availableInOfferUnit) ? bucket.required : availableInOfferUnit;
        consumedBase = fulfilled.mul(cartonKg);
        availableCartons = availableCartons.minus(fulfilled);
      } else if (type === 'normal_loose_unit') {
        const unitKg = decimal(bucket.entry.kg_per_carton || 0).div(bucket.entry.loose_units_per_carton || 1);
        availableInOfferUnit = unitKg.gt(0) ? availableBase.div(unitKg).floor() : decimal(0);
        const fulfilled = bucket.required.lte(availableInOfferUnit) ? bucket.required : availableInOfferUnit;
        consumedBase = fulfilled.mul(unitKg);
      } else {
        availableInOfferUnit = availableBase;
        const fulfilled = bucket.required.lte(availableInOfferUnit) ? bucket.required : availableInOfferUnit;
        consumedBase = fulfilled;
      }
      states.set(bucket, makeAvailabilityState(bucket, availableInOfferUnit));
      availableBase = availableBase.minus(consumedBase);
    }
  }

  // Ready cartons and bags share exact containers. Reserve full carton
  // candidates first, then make the remaining bag capacity available.
  for (const buckets of readyByGroup.values()) {
    const containers = (await readyContainerPool(buckets[0].entry.packaging_group_id, warehouseId, connection)).map((container) => ({
      ...container,
      available_inner: decimal(container.remaining_inner_quantity).minus(container.reserved_inner)
    }));
    const outerBuckets = buckets.filter((bucket) => bucket.entry.entry_type === 'ready_outer_carton');
    const innerBuckets = buckets.filter((bucket) => bucket.entry.entry_type === 'ready_inner_unit');
    for (const bucket of outerBuckets) {
      const candidates = containers.filter((container) =>
        container.status === 'full'
        && decimal(container.remaining_inner_quantity).eq(container.initial_inner_quantity)
        && decimal(container.reserved_outer).eq(0)
        && decimal(container.reserved_inner).eq(0)
        && decimal(container.available_inner).gt(0)
      );
      const available = decimal(candidates.length);
      const fulfilled = bucket.required.lte(available) ? bucket.required : available;
      states.set(bucket, makeAvailabilityState(bucket, available));
      for (const container of candidates.slice(0, Number(fulfilled))) container.available_inner = decimal(0);
    }
    for (const bucket of innerBuckets) {
      const available = containers.reduce((total, container) => (
        decimal(container.reserved_outer).gt(0) ? total : total.plus(container.available_inner.gt(0) ? container.available_inner : 0)
      ), decimal(0));
      const fulfilled = bucket.required.lte(available) ? bucket.required : available;
      states.set(bucket, makeAvailabilityState(bucket, available));
      let remaining = fulfilled;
      for (const container of containers) {
        if (remaining.lte(0) || decimal(container.reserved_outer).gt(0)) continue;
        const used = container.available_inner.lte(remaining) ? container.available_inner : remaining;
        container.available_inner = container.available_inner.minus(used);
        remaining = remaining.minus(used);
      }
    }
  }

  const perLine = new Map();
  const shortages = [];
  for (const bucket of byOffer.values()) {
    const state = states.get(bucket) || makeAvailabilityState(bucket, decimal(0));
    if (!state.available) shortages.push(state);
    for (const [index, line] of bucket.lines.entries()) {
      perLine.set(lineAvailabilityKey(line, `${bucket.entry.id}-${index}`), state);
    }
  }

  return {
    available: shortages.length === 0,
    shortages,
    perLine
  };
}

function lineAvailabilityKey(line, fallbackIndex) {
  return line.id ? Number(line.id) : `new-${fallbackIndex}`;
}

async function enrichOrder(order, lines, connection = null, includeAvailability = false) {
  const totals = calculateOrderTotals(lines);
  let availability = null;
  let enrichedLines = lines.map((line) => ({ ...line }));
  if (includeAvailability) {
    const assessed = await assessLinesAvailability(lines, order.warehouse_id, connection);
    availability = {
      available: assessed.available,
      shortages: assessed.shortages
    };
    enrichedLines = lines.map((line, index) => ({
      ...line,
      availability: assessed.perLine.get(lineAvailabilityKey(line, index)) || null
    }));
  }

  return {
    ...order,
    ...totals,
    availability,
    lines: enrichedLines
  };
}

async function getOwnOrder(orderId, actor = {}, input = {}) {
  const { storeId, salesman } = await getLinkedSalesman(actor, input);
  const order = await model.findOrderById(orderId);
  assertStoreRow(order, storeId, 'id', 'POS order not found');
  if (Number(order.salesman_id) !== Number(salesman.id)) {
    throw ApiError.notFound('POS order not found');
  }

  const [lines, events, dispatch_links] = await Promise.all([
    model.getOrderLines(order.id),
    model.getOrderEvents(order.id),
    model.getOrderDispatchLinks(order.id)
  ]);
  return {
    ...(await enrichOrder(order, lines, null, true)),
    events,
    dispatch_links
  };
}

async function listOwnOrders(input = {}, actor = {}) {
  const { storeId, salesman } = await getLinkedSalesman(actor, input);
  const result = await model.listOrders({
    ...input,
    store_id: storeId,
    salesman_id: salesman.id
  });
  const linesByOrderId = await model.getOrderLinesForOrderIds(result.rows.map((row) => row.id));
  const rows = await Promise.all(result.rows.map((order) =>
    enrichOrder(order, linesByOrderId.get(Number(order.id)) || [], null, true)
  ));
  return { ...result, rows };
}

async function getOwnWorkspace(input = {}, actor = {}) {
  const { storeId, salesman } = await getLinkedSalesman(actor, input);
  const scoped = {
    ...input,
    store_id: storeId,
    salesman_id: salesman.id,
    limit: input.limit || 20
  };
  const [metrics, recent_dispatches, recent_debts, recent_commissions, target_progress, territories, orderResult] = await Promise.all([
    model.getSalesmanWorkspaceSummary(scoped),
    model.listSalesmanWorkspaceDispatches(scoped),
    model.listSalesmanWorkspaceDebts(scoped),
    model.listSalesmanWorkspaceCommissions(scoped),
    model.listSalesmanWorkspaceTargets(scoped),
    model.listSalesmanTerritories(salesman.id),
    model.listOrders({ ...scoped, allRows: false })
  ]);

  return {
    salesman: {
      id: Number(salesman.id),
      full_name: salesman.full_name,
      code: salesman.code || null
    },
    metrics,
    territories,
    recent_orders: orderResult.rows,
    recent_dispatches,
    recent_debts,
    recent_commissions,
    target_progress
  };
}

async function listOwnTerritories(input = {}, actor = {}) {
  const { salesman } = await getLinkedSalesman(actor, input);
  return getTerritories(salesman.id);
}

async function listOwnCustomers(input = {}, actor = {}) {
  const { storeId, salesman } = await getLinkedSalesman(actor, input);
  return customerService.listCustomers({
    ...input,
    store_id: storeId,
    salesman_id: salesman.id,
    status: 'active'
  }, actor);
}

async function createOwnCustomer(data, userId, actor = {}) {
  const { storeId, salesman } = await getLinkedSalesman(actor, data);
  await assertTerritory(salesman.id, data.location_id, data.sublocation_id);
  return customerService.createCustomer({
    ...data,
    store_id: storeId,
    assigned_salesman_id: salesman.id,
    status: 'active'
  }, userId, actor);
}

async function listCatalog(input = {}, actor = {}) {
  const { storeId } = await getLinkedSalesman(actor, input);
  await assertWarehouse(input.warehouse_id, storeId);
  const result = await model.listPosCatalogEntries({
    ...input,
    store_id: storeId
  });
  const availableRows = [];
  for (const entry of result.rows) {
    const completeEntry = await model.findSaleCatalogEntryById(entry.id);
    if (
      (completeEntry.item_id && completeEntry.item_status !== 'active')
      || (completeEntry.packaging_group_id && completeEntry.packaging_group_status !== 'active')
    ) {
      continue;
    }
    const available = await offerAvailability(completeEntry, input.warehouse_id);
    if (available.gt(0)) {
      // Quantities are intentionally never exposed to the salesman POS API.
      availableRows.push({
        ...entry,
        available: true
      });
    }
  }

  return {
    ...result,
    rows: availableRows,
    meta: {
      ...result.meta,
      availableTotal: availableRows.length
    }
  };
}

async function createOwnOrder(data, userId, actor = {}) {
  return withTransaction(async (connection) => {
    const { storeId, salesman } = await getLinkedSalesman(actor, data, connection);
    await assertWarehouse(data.warehouse_id, storeId, connection);
    const customer = await assertOrderCustomer(data.customer_id, salesman, storeId, connection);
    const lines = await resolveOrderLines(data.lines, storeId, connection);
    assertGiftRequestPermission(lines, actor);
    const orderId = await model.createOrder(connection, {
      store_id: storeId,
      order_number: data.order_number || createDocumentNumber('POS'),
      salesman_id: salesman.id,
      warehouse_id: data.warehouse_id,
      customer_id: customer.id,
      location_id: customer.location_id,
      sublocation_id: customer.sublocation_id,
      order_date: data.order_date || today(),
      notes: data.notes,
      created_by: userId,
      updated_by: userId
    });
    await model.replaceOrderLines(connection, orderId, lines);
    const order = await model.findOrderById(orderId, connection);
    await model.createOrderEvent(connection, {
      store_id: storeId,
      pos_order_id: orderId,
      event_type: 'created',
      actor_user_id: userId,
      new_values_json: serializeOrderSnapshot(order, lines),
      notes: 'Salesman created a pending Mini POS order'
    });

    return enrichOrder(order, await model.getOrderLines(orderId, connection), connection, true);
  });
}

async function updateOwnOrder(orderId, data, actor = {}) {
  return withTransaction(async (connection) => {
    const { storeId, salesman } = await getLinkedSalesman(actor, data, connection);
    const order = await model.findOrderById(orderId, connection, true);
    assertStoreRow(order, storeId, 'id', 'POS order not found');
    if (Number(order.salesman_id) !== Number(salesman.id)) {
      throw ApiError.notFound('POS order not found');
    }
    if (order.status !== 'pending') {
      throw ApiError.conflict('Only pending POS orders can be edited');
    }

    const oldLines = await model.getOrderLines(order.id, connection, true);
    const warehouseId = data.warehouse_id || order.warehouse_id;
    const customerId = data.customer_id || order.customer_id;
    await assertWarehouse(warehouseId, storeId, connection);
    const customer = await assertOrderCustomer(customerId, salesman, storeId, connection);
    const lines = data.lines === undefined
      ? oldLines.map(serializeLine)
      : await resolveOrderLines(data.lines, storeId, connection);
    if (data.lines !== undefined) assertGiftRequestPermission(lines, actor);

    await model.updateOrder(connection, order.id, {
      warehouse_id: warehouseId,
      customer_id: customer.id,
      location_id: customer.location_id,
      sublocation_id: customer.sublocation_id,
      order_date: data.order_date === undefined ? order.order_date : data.order_date,
      notes: data.notes === undefined ? order.notes : data.notes,
      updated_by: actor.id
    });
    if (data.lines !== undefined) {
      await model.replaceOrderLines(connection, order.id, lines);
    }

    const updated = await model.findOrderById(order.id, connection);
    const updatedLines = await model.getOrderLines(order.id, connection);
    await model.createOrderEvent(connection, {
      store_id: storeId,
      pos_order_id: order.id,
      event_type: 'updated',
      actor_user_id: actor.id,
      old_values_json: serializeOrderSnapshot(order, oldLines),
      new_values_json: serializeOrderSnapshot(updated, updatedLines),
      notes: 'Salesman edited a pending Mini POS order'
    });

    return enrichOrder(updated, updatedLines, connection, true);
  });
}

async function cancelOwnOrder(orderId, data, actor = {}) {
  return withTransaction(async (connection) => {
    const { storeId, salesman } = await getLinkedSalesman(actor, data, connection);
    const order = await model.findOrderById(orderId, connection, true);
    assertStoreRow(order, storeId, 'id', 'POS order not found');
    if (Number(order.salesman_id) !== Number(salesman.id)) {
      throw ApiError.notFound('POS order not found');
    }
    if (order.status !== 'pending') {
      throw ApiError.conflict('Only pending POS orders can be cancelled');
    }

    await model.setOrderStatus(connection, order.id, {
      status: 'cancelled',
      updated_by: actor.id,
      cancelled_by: actor.id,
      cancelled_at: new Date()
    });
    const updated = await model.findOrderById(order.id, connection);
    await model.createOrderEvent(connection, {
      store_id: storeId,
      pos_order_id: order.id,
      event_type: 'cancelled',
      actor_user_id: actor.id,
      old_values_json: { status: order.status },
      new_values_json: { status: 'cancelled' },
      notes: data.notes || 'Salesman cancelled the pending Mini POS order'
    });
    return enrichOrder(updated, await model.getOrderLines(order.id, connection), connection, true);
  });
}

function normalizeGiftDecisions(giftLines, suppliedDecisions = [], { required = false } = {}) {
  if (!giftLines.length) {
    if (suppliedDecisions.length) {
      throw validationError('gift_decisions', 'No selected POS order contains a gift line');
    }
    return { decisions: new Map(), required: false };
  }
  if (!suppliedDecisions.length && !required) {
    return { decisions: new Map(), required: true };
  }
  if (!suppliedDecisions.length) {
    throw validationError(
      'gift_decisions',
      'Every requested gift must be explicitly approved or removed before conversion'
    );
  }

  const validGiftIds = new Set(giftLines.map((line) => Number(line.id)));
  const decisions = new Map();
  for (const decision of suppliedDecisions) {
    const lineId = Number(decision.pos_order_line_id);
    if (!validGiftIds.has(lineId)) {
      throw validationError('gift_decisions', 'A gift decision references a line outside the selected orders');
    }
    if (decisions.has(lineId)) {
      throw validationError('gift_decisions', 'A gift line can only have one decision');
    }
    decisions.set(lineId, decision.decision);
  }
  if (decisions.size !== validGiftIds.size) {
    throw validationError(
      'gift_decisions',
      'Every requested gift must be explicitly approved or removed before conversion'
    );
  }

  return { decisions, required: false };
}

function dispatchPayloadForOrders(orders) {
  const customers = new Map();
  for (const order of orders) {
    let customer = customers.get(Number(order.customer_id));
    if (!customer) {
      customer = {
        customer_id: Number(order.customer_id),
        location_id: Number(order.location_id),
        sublocation_id: Number(order.sublocation_id),
        source_pos_order_ids: [],
        lines: []
      };
      customers.set(Number(order.customer_id), customer);
    }
    customer.source_pos_order_ids.push(Number(order.id));
    for (const line of order.selected_lines) {
      customer.lines.push({
        source_pos_order_id: Number(order.id),
        source_pos_order_line_id: Number(line.id),
        sale_catalog_entry_id: Number(line.sale_catalog_entry_id),
        item_id: line.item_id ? Number(line.item_id) : null,
        packaging_group_id: line.packaging_group_id ? Number(line.packaging_group_id) : null,
        line_type: line.line_type,
        fulfillment_type: line.fulfillment_type,
        quantity: toMoney(line.quantity),
        unit_price: toMoney(line.unit_price || 0),
        vat_rate: toMoney(line.vat_rate || 0),
        notes: line.notes || null
      });
    }
  }
  return [...customers.values()];
}

async function prepareSelectedOrders(input, actor = {}, options = {}) {
  const { connection = null, lock = false, requireGiftDecisions = false } = options;
  const storeId = resolveStoreId(actor, input);
  const orderIds = [...new Set((input.pos_order_ids || []).map(Number))];
  if (!orderIds.length) {
    throw validationError('pos_order_ids', 'At least one POS order must be selected');
  }

  const orders = await model.findOrdersByIds(orderIds, connection, lock);
  if (orders.length !== orderIds.length) {
    throw validationError('pos_order_ids', 'One or more POS orders were not found');
  }

  let salesmanId = null;
  let warehouseId = null;
  const withLines = [];
  for (const order of orders) {
    assertStoreRow(order, storeId, 'pos_order_ids', 'POS order does not belong to this store');
    if (order.status !== 'pending') {
      throw ApiError.conflict('Only pending POS orders can be accepted for dispatch');
    }
    if (salesmanId === null) salesmanId = Number(order.salesman_id);
    if (warehouseId === null) warehouseId = Number(order.warehouse_id);
    if (Number(order.salesman_id) !== salesmanId) {
      throw validationError('pos_order_ids', 'Selected orders must belong to the same salesman');
    }
    if (Number(order.warehouse_id) !== warehouseId) {
      throw validationError('pos_order_ids', 'Selected orders must use the same warehouse');
    }
    const lines = await model.getOrderLines(order.id, connection, lock);
    if (!lines.length) {
      throw ApiError.conflict(`POS order ${order.order_number} has no lines`);
    }
    withLines.push({ ...order, lines });
  }

  const giftLines = withLines.flatMap((order) =>
    order.lines.filter((line) => line.line_type === 'free_gift')
  );
  if (giftLines.length && (requireGiftDecisions || input.gift_decisions?.length)) {
    if (!hasPermission(actor, 'dispatch.gifts.approve')) {
      throw ApiError.forbidden('You do not have permission to approve or remove requested gifts');
    }
  }
  const giftResolution = normalizeGiftDecisions(
    giftLines,
    input.gift_decisions || [],
    { required: requireGiftDecisions }
  );

  const preparedOrders = withLines.map((order) => ({
    ...order,
    selected_lines: order.lines.filter((line) =>
      line.line_type !== 'free_gift' || giftResolution.decisions.get(Number(line.id)) !== 'remove'
    ),
    removed_gift_lines: order.lines.filter((line) =>
      line.line_type === 'free_gift' && giftResolution.decisions.get(Number(line.id)) === 'remove'
    )
  }));
  const emptyOrders = preparedOrders.filter((order) => !order.selected_lines.length);
  if (emptyOrders.length && !giftResolution.required) {
    throw validationError(
      'gift_decisions',
      'Removing all lines from a selected order is not valid for dispatch conversion'
    );
  }

  const selectedLines = preparedOrders.flatMap((order) => order.selected_lines);
  const assessment = giftResolution.required
    ? { available: false, shortages: [] }
    : await assessLinesAvailability(selectedLines, warehouseId, connection);
  const selectableOrders = preparedOrders.map((order) => ({
    ...order,
    ...calculateOrderTotals(order.selected_lines),
    gift_decisions_required: giftResolution.required,
    removed_gift_line_ids: order.removed_gift_lines.map((line) => Number(line.id))
  }));
  const canConvert = !giftResolution.required
    && emptyOrders.length === 0
    && assessment.available;

  return {
    store_id: storeId,
    salesman_id: salesmanId,
    salesman_name: withLines[0]?.salesman_name || null,
    warehouse_id: warehouseId,
    warehouse_name: withLines[0]?.warehouse_name || null,
    pos_order_ids: orderIds,
    gift_decisions_required: giftResolution.required,
    can_convert: canConvert,
    shortages: assessment.shortages,
    selected_orders: selectableOrders,
    dispatch_payload: canConvert ? {
      salesman_id: salesmanId,
      warehouse_id: warehouseId,
      source_pos_order_ids: orderIds,
      customers: dispatchPayloadForOrders(selectableOrders)
    } : null
  };
}

async function listManagerReview(input = {}, actor = {}) {
  const storeId = resolveStoreId(actor, input);
  const result = await model.listOrders({
    ...input,
    store_id: storeId,
    status: 'pending',
    allRows: true
  });
  const linesByOrderId = await model.getOrderLinesForOrderIds(result.rows.map((row) => row.id));
  const orders = await Promise.all(result.rows.map((order) =>
    enrichOrder(order, linesByOrderId.get(Number(order.id)) || [], null, true)
  ));

  const bySalesman = new Map();
  for (const order of orders) {
    const key = Number(order.salesman_id);
    if (!bySalesman.has(key)) {
      bySalesman.set(key, {
        salesman_id: key,
        salesman_name: order.salesman_name,
        order_count: 0,
        warehouse_groups: new Map()
      });
    }
    const group = bySalesman.get(key);
    group.order_count += 1;
    const warehouseKey = Number(order.warehouse_id);
    if (!group.warehouse_groups.has(warehouseKey)) {
      group.warehouse_groups.set(warehouseKey, {
        warehouse_id: warehouseKey,
        warehouse_name: order.warehouse_name,
        orders: []
      });
    }
    group.warehouse_groups.get(warehouseKey).orders.push(order);
  }

  const salesmen = [];
  for (const group of bySalesman.values()) {
    const warehouse_groups = [];
    for (const warehouseGroup of group.warehouse_groups.values()) {
      const assessment = await assessLinesAvailability(
        warehouseGroup.orders.flatMap((order) => order.lines),
        warehouseGroup.warehouse_id
      );
      warehouse_groups.push({
        ...warehouseGroup,
        authoritative_shortage_state: {
          available: assessment.available,
          shortages: assessment.shortages
        }
      });
    }
    salesmen.push({
      salesman_id: group.salesman_id,
      salesman_name: group.salesman_name,
      order_count: group.order_count,
      warehouse_groups
    });
  }

  return {
    rows: salesmen,
    meta: {
      pending_order_count: orders.length,
      salesman_count: salesmen.length
    }
  };
}

async function convertSelectedOrdersToDispatch(connection, input, actor = {}) {
  if (!connection) {
    throw new Error('convertSelectedOrdersToDispatch requires the dispatch transaction connection');
  }
  if (!input.dispatch_request_id) {
    throw validationError('dispatch_request_id', 'A created dispatch request is required');
  }

  const dispatch = await model.lockDispatchRequest(connection, input.dispatch_request_id);
  const preparation = await prepareSelectedOrders(input, actor, {
    connection,
    lock: true,
    requireGiftDecisions: true
  });
  assertStoreRow(dispatch, preparation.store_id, 'dispatch_request_id', 'Dispatch does not belong to this store');
  if (Number(dispatch.salesman_id) !== Number(preparation.salesman_id)) {
    throw validationError('dispatch_request_id', 'Dispatch salesman must match the selected POS orders');
  }
  if (Number(dispatch.warehouse_id) !== Number(preparation.warehouse_id)) {
    throw validationError('dispatch_request_id', 'Dispatch warehouse must match the selected POS orders');
  }
  if (!preparation.can_convert) {
    throw ApiError.conflict('Selected POS orders cannot be converted because stock is unavailable');
  }

  for (const order of preparation.selected_orders) {
    if (order.removed_gift_lines.length) {
      await model.createOrderEvent(connection, {
        store_id: preparation.store_id,
        pos_order_id: order.id,
        event_type: 'gift_removed',
        actor_user_id: actor.id,
        old_values_json: { lines: order.removed_gift_lines.map(serializeLine) },
        new_values_json: { removed_line_ids: order.removed_gift_lines.map((line) => Number(line.id)) },
        notes: 'Manager removed requested gifts before POS conversion'
      });
      await model.removeOrderLines(connection, order.removed_gift_lines.map((line) => line.id));
    }

    const approvedGifts = order.selected_lines.filter((line) => line.line_type === 'free_gift');
    if (approvedGifts.length) {
      await model.createOrderEvent(connection, {
        store_id: preparation.store_id,
        pos_order_id: order.id,
        event_type: 'gift_approved',
        actor_user_id: actor.id,
        new_values_json: { lines: approvedGifts.map(serializeLine) },
        notes: 'Manager approved requested gifts before POS conversion'
      });
    }

    await model.setOrderStatus(connection, order.id, {
      status: 'accepted',
      updated_by: actor.id,
      accepted_by: actor.id,
      accepted_at: new Date()
    });
    await model.createOrderEvent(connection, {
      store_id: preparation.store_id,
      pos_order_id: order.id,
      event_type: 'accepted',
      actor_user_id: actor.id,
      old_values_json: { status: 'pending' },
      new_values_json: { status: 'accepted' },
      notes: `Accepted for combined dispatch ${dispatch.dispatch_number}`
    });

    await model.setOrderStatus(connection, order.id, {
      status: 'converted',
      dispatch_request_id: dispatch.id,
      updated_by: actor.id
    });
    await model.linkOrderToDispatch(connection, order.id, dispatch.id);
    await model.createOrderEvent(connection, {
      store_id: preparation.store_id,
      pos_order_id: order.id,
      event_type: 'converted',
      actor_user_id: actor.id,
      old_values_json: { status: 'accepted' },
      new_values_json: {
        status: 'converted',
        dispatch_request_id: Number(dispatch.id),
        dispatch_number: dispatch.dispatch_number
      },
      notes: `Converted into combined dispatch ${dispatch.dispatch_number}`
    });
  }

  return preparation;
}

module.exports = {
  convertSelectedOrdersToDispatch,
  createOwnCustomer,
  createOwnOrder,
  getOwnOrder,
  getOwnWorkspace,
  listCatalog,
  listManagerReview,
  listOwnCustomers,
  listOwnOrders,
  listOwnTerritories,
  prepareSelectedOrders: (input, actor = {}) => prepareSelectedOrders(input, actor, {
    requireGiftDecisions: false
  }),
  cancelOwnOrder,
  updateOwnOrder,
  _private: {
    assessLinesAvailability,
    offerAvailability,
    prepareSelectedOrders,
    resolveOrderLines
  }
};
