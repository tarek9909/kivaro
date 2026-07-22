const { query } = require('../../bootstrap/db');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { nullable } = require('../../utils/crud');

async function execute(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

function listFilters(input, definitions) {
  const conditions = [];
  const params = [];
  for (const definition of definitions) {
    const value = input[definition.key];
    if (value === undefined || value === null || value === '') continue;
    if (definition.operator === 'date_gte') {
      conditions.push(`DATE(${definition.column}) >= ?`);
    } else if (definition.operator === 'date_lte') {
      conditions.push(`DATE(${definition.column}) <= ?`);
    } else if (definition.search) {
      const term = `%${value}%`;
      conditions.push(`(${definition.search.map((column) => `${column} LIKE ?`).join(' OR ')})`);
      params.push(...definition.search.map(() => term));
      continue;
    } else {
      conditions.push(`${definition.column} = ?`);
    }
    params.push(value);
  }
  return { conditions, params };
}

async function listDispatchRequests(input = {}) {
  const pagination = getPagination(input);
  const { conditions, params } = listFilters(input, [
    { key: 'store_id', column: 'dr.store_id' },
    { key: 'status', column: 'dr.status' },
    { key: 'salesman_id', column: 'dr.salesman_id' },
    { key: 'warehouse_id', column: 'dr.warehouse_id' },
    { key: 'date_from', column: 'dr.request_date', operator: 'date_gte' },
    { key: 'date_to', column: 'dr.request_date', operator: 'date_lte' },
    { key: 'search', search: ['dr.dispatch_number', 's.full_name'] }
  ]);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `
    JOIN salesmen s ON s.id = dr.salesman_id
    JOIN warehouses w ON w.id = dr.warehouse_id`;
  const count = await query(`SELECT COUNT(*) AS total FROM dispatch_requests dr ${joins} ${where}`, params);
  const rows = await query(
    `SELECT dr.*, s.full_name AS salesman_name, w.name AS warehouse_name,
        COALESCE(customer_summary.customer_count, 0) AS customer_count,
        COALESCE(customer_summary.gift_line_count, 0) AS gift_line_count,
        COALESCE(invoice_summary.invoice_count, 0) AS invoice_count,
        COALESCE(invoice_summary.issued_invoice_count, 0) AS issued_invoice_count,
        COALESCE(allocation_summary.reserved_cost, 0) AS reserved_cost,
        COALESCE(allocation_summary.dispatched_cost, 0) AS dispatched_cost
     FROM dispatch_requests dr
     ${joins}
     LEFT JOIN (
       SELECT dc.dispatch_request_id, COUNT(DISTINCT dc.id) AS customer_count,
         SUM(CASE WHEN di.line_type = 'free_gift' THEN 1 ELSE 0 END) AS gift_line_count
       FROM dispatch_customers dc
       LEFT JOIN dispatch_items di ON di.dispatch_customer_id = dc.id
       GROUP BY dc.dispatch_request_id
     ) customer_summary ON customer_summary.dispatch_request_id = dr.id
     LEFT JOIN (
       SELECT dispatch_request_id, COUNT(*) AS invoice_count,
         SUM(status = 'issued') AS issued_invoice_count
       FROM invoices
       GROUP BY dispatch_request_id
     ) invoice_summary ON invoice_summary.dispatch_request_id = dr.id
     LEFT JOIN (
       SELECT di.dispatch_request_id,
         SUM(CASE WHEN dla.status = 'reserved' THEN dla.total_cost ELSE 0 END) AS reserved_cost,
         SUM(CASE WHEN dla.status IN ('dispatched', 'returned') THEN dla.total_cost ELSE 0 END) AS dispatched_cost
       FROM dispatch_items di
       LEFT JOIN dispatch_line_allocations dla ON dla.dispatch_item_id = di.id
       GROUP BY di.dispatch_request_id
     ) allocation_summary ON allocation_summary.dispatch_request_id = dr.id
     ${where}
     ORDER BY dr.request_date DESC, dr.id DESC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function findDispatchRequestById(id, connection = null) {
  const rows = await execute(connection,
    `SELECT dr.*, s.full_name AS salesman_name, s.user_id AS salesman_user_id,
        w.name AS warehouse_name
     FROM dispatch_requests dr
     JOIN salesmen s ON s.id = dr.salesman_id
     JOIN warehouses w ON w.id = dr.warehouse_id
     WHERE dr.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findSalesmanByUserId(userId, storeId, connection = null) {
  const rows = await execute(connection,
    `SELECT id, store_id, user_id, status
     FROM salesmen
     WHERE user_id = ? AND store_id = ?
     LIMIT 1`,
    [userId, storeId]
  );
  return rows[0] || null;
}

async function lockDispatchRequest(connection, id) {
  const [rows] = await connection.execute(
    `SELECT * FROM dispatch_requests WHERE id = ? LIMIT 1 FOR UPDATE`,
    [id]
  );
  return rows[0] || null;
}

async function createDispatchRequest(data, connection = null) {
  const result = await execute(connection,
    `INSERT INTO dispatch_requests (
      store_id, dispatch_number, salesman_id, warehouse_id, request_date, status,
      total_quantity, subtotal_amount, vat_amount, total_amount, total_collected, total_debt,
      notes, created_by
    ) VALUES (?, ?, ?, ?, ?, 'draft', 0, 0, 0, 0, 0, 0, ?, ?)`,
    [
      data.store_id, data.dispatch_number, data.salesman_id, data.warehouse_id,
      data.request_date, nullable(data.notes), nullable(data.created_by)
    ]
  );
  return findDispatchRequestById(result.insertId, connection);
}

async function updateDispatchRequest(id, data, connection = null) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length) {
    await execute(connection,
      `UPDATE dispatch_requests SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => nullable(value)), id]
    );
  }
  return findDispatchRequestById(id, connection);
}

async function getDispatchCustomers(dispatchId, connection = null) {
  return execute(connection,
    `SELECT dc.*, c.name AS customer_name, c.phone AS customer_phone,
        l.name AS location_name, sl.name AS sublocation_name,
        inv.id AS invoice_id, inv.invoice_number, inv.status AS invoice_status,
        inv.revision AS invoice_revision
     FROM dispatch_customers dc
     JOIN customers c ON c.id = dc.customer_id
     JOIN locations l ON l.id = dc.location_id
     JOIN sublocations sl ON sl.id = dc.sublocation_id
     LEFT JOIN invoices inv ON inv.dispatch_customer_id = dc.id
       AND inv.revision = (SELECT revision FROM dispatch_requests WHERE id = dc.dispatch_request_id)
     WHERE dc.dispatch_request_id = ?
     ORDER BY dc.id ASC`,
    [dispatchId]
  );
}

async function findDispatchCustomerById(id, connection = null) {
  const rows = await execute(connection,
    `SELECT dc.*, dr.store_id, dr.salesman_id, dr.warehouse_id, dr.status AS dispatch_status,
        c.name AS customer_name
     FROM dispatch_customers dc
     JOIN dispatch_requests dr ON dr.id = dc.dispatch_request_id
     JOIN customers c ON c.id = dc.customer_id
     WHERE dc.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createDispatchCustomer(data, connection = null) {
  const result = await execute(connection,
    `INSERT INTO dispatch_customers (
      store_id, dispatch_request_id, customer_id, location_id, sublocation_id,
      subtotal_amount, vat_amount, customer_total_amount, collected_amount, debt_amount,
      payment_status, receipt_number, notes
    ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'pending', ?, ?)`,
    [
      data.store_id, data.dispatch_request_id, data.customer_id, data.location_id,
      data.sublocation_id, nullable(data.receipt_number), nullable(data.notes)
    ]
  );
  return findDispatchCustomerById(result.insertId, connection);
}

async function updateDispatchCustomer(id, data, connection = null) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length) {
    await execute(connection,
      `UPDATE dispatch_customers SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => nullable(value)), id]
    );
  }
  return findDispatchCustomerById(id, connection);
}

async function getDispatchItems(dispatchId, connection = null) {
  return execute(connection,
    `SELECT di.*, sce.display_name AS catalog_display_name, sce.default_price AS catalog_default_price,
        COALESCE(allocation_summary.allocated_total_cost, 0) AS allocated_total_cost,
        COALESCE(allocation_summary.reserved_inventory_quantity, 0) AS reserved_inventory_quantity,
        COALESCE(allocation_summary.dispatched_inventory_quantity, 0) AS dispatched_inventory_quantity
     FROM dispatch_items di
     LEFT JOIN sale_catalog_entries sce ON sce.id = di.sale_catalog_entry_id
     LEFT JOIN (
       SELECT dispatch_item_id,
         SUM(total_cost) AS allocated_total_cost,
         SUM(CASE WHEN status = 'reserved' THEN inventory_quantity ELSE 0 END) AS reserved_inventory_quantity,
         SUM(CASE WHEN status = 'dispatched' THEN inventory_quantity ELSE 0 END) AS dispatched_inventory_quantity
       FROM dispatch_line_allocations
       GROUP BY dispatch_item_id
     ) allocation_summary ON allocation_summary.dispatch_item_id = di.id
     WHERE di.dispatch_request_id = ?
     ORDER BY di.dispatch_customer_id ASC, di.id ASC`,
    [dispatchId]
  );
}

async function findDispatchItemById(id, connection = null, lock = false) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  const rows = await execute(connection,
    `SELECT di.*, dr.store_id, dr.warehouse_id, dr.status AS dispatch_status, dr.revision,
        dc.customer_id, dc.dispatch_request_id
     FROM dispatch_items di
     JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
     JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id
     WHERE di.id = ?
     LIMIT 1${suffix}`,
    [id]
  );
  return rows[0] || null;
}

async function createDispatchItem(data, connection = null) {
  const result = await execute(connection,
    `INSERT INTO dispatch_items (
      store_id, dispatch_customer_id, dispatch_request_id, sale_catalog_entry_id, item_id,
      packaging_group_id, line_type, fulfillment_type, quantity, unit_price, unit_cost,
      subtotal_amount, vat_rate, vat_amount, line_total, returned_quantity,
      item_name_snapshot, unit_label_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      data.store_id, data.dispatch_customer_id, data.dispatch_request_id,
      data.sale_catalog_entry_id, nullable(data.item_id), nullable(data.packaging_group_id),
      data.line_type, data.fulfillment_type, data.quantity, data.unit_price, data.unit_cost,
      data.subtotal_amount, data.vat_rate, data.vat_amount, data.line_total,
      data.item_name_snapshot, data.unit_label_snapshot
    ]
  );
  return findDispatchItemById(result.insertId, connection);
}

async function updateDispatchItem(id, data, connection = null) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length) {
    await execute(connection,
      `UPDATE dispatch_items SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
      [...entries.map(([, value]) => nullable(value)), id]
    );
  }
  return findDispatchItemById(id, connection);
}

async function deleteDispatchItem(id, connection = null) {
  await execute(connection, 'DELETE FROM dispatch_items WHERE id = ?', [id]);
}

async function recalculateDispatchTotals(connection, dispatchId) {
  await connection.execute(
    `UPDATE dispatch_customers dc
     SET subtotal_amount = (
       SELECT COALESCE(SUM(di.subtotal_amount), 0) FROM dispatch_items di WHERE di.dispatch_customer_id = dc.id
     ), vat_amount = (
       SELECT COALESCE(SUM(di.vat_amount), 0) FROM dispatch_items di WHERE di.dispatch_customer_id = dc.id
     ), customer_total_amount = (
       SELECT COALESCE(SUM(di.line_total), 0) FROM dispatch_items di WHERE di.dispatch_customer_id = dc.id
     )
     WHERE dc.dispatch_request_id = ?`,
    [dispatchId]
  );
  await connection.execute(
    `UPDATE dispatch_requests dr
     SET total_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM dispatch_items WHERE dispatch_request_id = dr.id),
       subtotal_amount = (SELECT COALESCE(SUM(subtotal_amount), 0) FROM dispatch_items WHERE dispatch_request_id = dr.id),
       vat_amount = (SELECT COALESCE(SUM(vat_amount), 0) FROM dispatch_items WHERE dispatch_request_id = dr.id),
       total_amount = (SELECT COALESCE(SUM(line_total), 0) FROM dispatch_items WHERE dispatch_request_id = dr.id)
     WHERE dr.id = ?`,
    [dispatchId]
  );
  return findDispatchRequestById(dispatchId, connection);
}

async function getInvoiceById(id, connection = null) {
  const rows = await execute(connection,
    `SELECT inv.*, dr.dispatch_number, dr.request_date, dr.salesman_id, s.user_id AS salesman_user_id,
        dc.customer_id, c.name AS customer_name,
        c.phone AS customer_phone, c.address AS customer_address
     FROM invoices inv
     JOIN dispatch_requests dr ON dr.id = inv.dispatch_request_id
     JOIN salesmen s ON s.id = dr.salesman_id
     JOIN dispatch_customers dc ON dc.id = inv.dispatch_customer_id
     JOIN customers c ON c.id = dc.customer_id
     WHERE inv.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function listInvoices(input = {}) {
  const pagination = getPagination(input);
  const { conditions, params } = listFilters(input, [
    { key: 'store_id', column: 'inv.store_id' },
    { key: 'salesman_id', column: 'dr.salesman_id' },
    { key: 'dispatch_request_id', column: 'inv.dispatch_request_id' },
    { key: 'customer_id', column: 'dc.customer_id' },
    { key: 'status', column: 'inv.status' },
    { key: 'date_from', column: 'inv.invoice_date', operator: 'date_gte' },
    { key: 'date_to', column: 'inv.invoice_date', operator: 'date_lte' },
    { key: 'search', search: ['inv.invoice_number', 'dr.dispatch_number', 'c.name'] }
  ]);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const joins = `
    JOIN dispatch_requests dr ON dr.id = inv.dispatch_request_id
    JOIN dispatch_customers dc ON dc.id = inv.dispatch_customer_id
    JOIN customers c ON c.id = dc.customer_id`;
  const count = await query(`SELECT COUNT(*) AS total FROM invoices inv ${joins} ${where}`, params);
  const rows = await query(
    `SELECT inv.*, dr.dispatch_number, dc.customer_id, c.name AS customer_name
     FROM invoices inv ${joins} ${where}
     ORDER BY inv.invoice_date DESC, inv.id DESC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function getInvoicesForDispatch(dispatchId, connection = null) {
  return execute(connection,
    `SELECT inv.*, dc.customer_id, c.name AS customer_name
     FROM invoices inv
     JOIN dispatch_customers dc ON dc.id = inv.dispatch_customer_id
     JOIN customers c ON c.id = dc.customer_id
     WHERE inv.dispatch_request_id = ?
     ORDER BY inv.id ASC`,
    [dispatchId]
  );
}

async function getInvoiceLines(invoiceId, connection = null) {
  return execute(connection,
    `SELECT * FROM invoice_lines WHERE invoice_id = ? ORDER BY id ASC`,
    [invoiceId]
  );
}

async function createInvoice(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO invoices (
      store_id, dispatch_request_id, dispatch_customer_id, invoice_number, revision, status,
      invoice_date, subtotal_amount, vat_amount, total_amount, created_by
    ) VALUES (?, ?, ?, ?, ?, 'issued', CURRENT_DATE(), ?, ?, ?, ?)`,
    [
      data.store_id, data.dispatch_request_id, data.dispatch_customer_id, data.invoice_number,
      data.revision, data.subtotal_amount, data.vat_amount, data.total_amount, data.created_by
    ]
  );
  return getInvoiceById(result.insertId, connection);
}

async function createInvoiceLine(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO invoice_lines (
      invoice_id, dispatch_item_id, line_type, description, quantity, unit_label, unit_price,
      unit_cost, subtotal_amount, vat_rate, vat_amount, line_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.invoice_id, data.dispatch_item_id, data.line_type, data.description, data.quantity,
      data.unit_label, data.unit_price, data.unit_cost, data.subtotal_amount, data.vat_rate,
      data.vat_amount, data.line_total
    ]
  );
  return result.insertId;
}

async function voidInvoicesForDispatchRevision(connection, dispatchId, revision, userId, reason) {
  await connection.execute(
    `UPDATE invoices
     SET status = 'voided', voided_by = ?, voided_at = NOW(), void_reason = ?
     WHERE dispatch_request_id = ? AND revision = ? AND status = 'issued'`,
    [nullable(userId), nullable(reason), dispatchId, revision]
  );
}

async function createDocumentGeneration(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO dispatch_document_generations (
      store_id, dispatch_request_id, dispatch_customer_id, invoice_id, document_type,
      revision, generated_by, generated_at, file_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [
      data.store_id, data.dispatch_request_id, nullable(data.dispatch_customer_id), nullable(data.invoice_id),
      data.document_type, data.revision, nullable(data.generated_by), data.file_name
    ]
  );
  return result.insertId;
}

async function getDocumentChecklist(dispatchId, revision, connection = null) {
  const rows = await execute(connection,
    `SELECT
       EXISTS(
         SELECT 1 FROM dispatch_document_generations
         WHERE dispatch_request_id = ? AND revision = ? AND document_type = 'customer_table'
       ) AS customer_table_generated,
       EXISTS(
         SELECT 1 FROM dispatch_document_generations
         WHERE dispatch_request_id = ? AND revision = ? AND document_type = 'quantity_table'
       ) AS quantity_table_generated,
       (SELECT COUNT(*) FROM invoices WHERE dispatch_request_id = ? AND revision = ? AND status = 'issued') AS required_invoice_count,
       (SELECT COUNT(DISTINCT invoice_id) FROM dispatch_document_generations
        WHERE dispatch_request_id = ? AND revision = ? AND document_type = 'invoice') AS generated_invoice_count`,
    [
      dispatchId, revision,
      dispatchId, revision,
      dispatchId, revision,
      dispatchId, revision
    ]
  );
  const checklist = rows[0] || {};
  return {
    customer_table_generated: Boolean(checklist.customer_table_generated),
    quantity_table_generated: Boolean(checklist.quantity_table_generated),
    required_invoice_count: Number(checklist.required_invoice_count || 0),
    generated_invoice_count: Number(checklist.generated_invoice_count || 0),
    ready_for_approval: Boolean(checklist.customer_table_generated)
      && Boolean(checklist.quantity_table_generated)
      && Number(checklist.required_invoice_count || 0) > 0
      && Number(checklist.required_invoice_count || 0) === Number(checklist.generated_invoice_count || 0)
  };
}

async function createDispatchLineAllocation(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO dispatch_line_allocations (
      store_id, dispatch_item_id, warehouse_id, item_id, carton_stock_lot_id, open_carton_shelf_id,
      ready_stock_container_id, allocation_type, allocated_quantity, inventory_quantity,
      unit_cost, total_cost, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id, data.dispatch_item_id, data.warehouse_id, nullable(data.item_id),
      nullable(data.carton_stock_lot_id), nullable(data.open_carton_shelf_id), nullable(data.ready_stock_container_id),
      data.allocation_type, data.allocated_quantity, data.inventory_quantity, data.unit_cost,
      data.total_cost, data.status || 'reserved'
    ]
  );
  return result.insertId;
}

async function getLineAllocations(dispatchItemId, connection = null, lock = false) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  return execute(connection,
    `SELECT * FROM dispatch_line_allocations
     WHERE dispatch_item_id = ?
     ORDER BY id ASC${suffix}`,
    [dispatchItemId]
  );
}

async function getDispatchAllocations(dispatchId, connection = null, lock = false) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  return execute(connection,
    `SELECT dla.*, di.fulfillment_type, di.line_type, di.dispatch_customer_id,
        di.quantity AS line_quantity, di.item_id AS line_item_id, di.packaging_group_id,
        di.returned_quantity
     FROM dispatch_line_allocations dla
     JOIN dispatch_items di ON di.id = dla.dispatch_item_id
     WHERE di.dispatch_request_id = ?
     ORDER BY di.id ASC, dla.id ASC${suffix}`,
    [dispatchId]
  );
}

async function updateDispatchLineAllocation(connection, id, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (!entries.length) return;
  await connection.execute(
    `UPDATE dispatch_line_allocations SET ${entries.map(([key]) => `${key} = ?`).join(', ')} WHERE id = ?`,
    [...entries.map(([, value]) => nullable(value)), id]
  );
}

async function getReservedQuantityByLot(connection, lotId) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(allocated_quantity), 0) AS quantity
     FROM dispatch_line_allocations
     WHERE carton_stock_lot_id = ? AND status = 'reserved'`,
    [lotId]
  );
  return rows[0]?.quantity || 0;
}

async function getReservedQuantityByShelf(connection, shelfId) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(allocated_quantity), 0) AS quantity
     FROM dispatch_line_allocations
     WHERE open_carton_shelf_id = ? AND status = 'reserved'`,
    [shelfId]
  );
  return rows[0]?.quantity || 0;
}

async function getReservedQuantityByReadyContainer(connection, containerId) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(allocated_quantity), 0) AS quantity
     FROM dispatch_line_allocations
     WHERE ready_stock_container_id = ? AND status = 'reserved'`,
    [containerId]
  );
  return rows[0]?.quantity || 0;
}

async function createDispatchReturn(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO dispatch_returns (
      store_id, dispatch_request_id, dispatch_item_id, returned_quantity, reason, created_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.store_id, data.dispatch_request_id, data.dispatch_item_id, data.returned_quantity,
      nullable(data.reason), nullable(data.created_by)
    ]
  );
  return result.insertId;
}

async function createSettlement(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO dispatch_settlements (
      store_id, dispatch_request_id, cash_account_id, settlement_number, settlement_date,
      total_expected, total_collected, total_debt, total_returned_value, status, settled_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id, data.dispatch_request_id, nullable(data.cash_account_id), data.settlement_number,
      data.settlement_date, data.total_expected || 0, data.total_collected || 0, data.total_debt || 0,
      data.total_returned_value || 0, data.status || 'draft', nullable(data.settled_by), nullable(data.notes)
    ]
  );
  return findSettlementById(result.insertId, connection);
}

async function findSettlementById(id, connection = null) {
  const rows = await execute(connection,
    `SELECT ds.*, dr.dispatch_number, dr.salesman_id, s.user_id AS salesman_user_id
     FROM dispatch_settlements ds
     JOIN dispatch_requests dr ON dr.id = ds.dispatch_request_id
     JOIN salesmen s ON s.id = dr.salesman_id
     WHERE ds.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function listSettlementsByDispatch(dispatchId, connection = null) {
  return execute(connection,
    `SELECT * FROM dispatch_settlements WHERE dispatch_request_id = ? ORDER BY id DESC`,
    [dispatchId]
  );
}

module.exports = {
  createDispatchCustomer,
  createDispatchItem,
  createDispatchLineAllocation,
  createDispatchRequest,
  createDispatchReturn,
  createDocumentGeneration,
  createInvoice,
  createInvoiceLine,
  createSettlement,
  deleteDispatchItem,
  findDispatchCustomerById,
  findDispatchItemById,
  findDispatchRequestById,
  findSalesmanByUserId,
  findSettlementById,
  getDispatchAllocations,
  getDispatchCustomers,
  getDispatchItems,
  getDocumentChecklist,
  getInvoiceById,
  getInvoiceLines,
  getInvoicesForDispatch,
  getLineAllocations,
  getReservedQuantityByLot,
  getReservedQuantityByReadyContainer,
  getReservedQuantityByShelf,
  listDispatchRequests,
  listInvoices,
  listSettlementsByDispatch,
  lockDispatchRequest,
  recalculateDispatchTotals,
  updateDispatchCustomer,
  updateDispatchItem,
  updateDispatchLineAllocation,
  updateDispatchRequest,
  voidInvoicesForDispatchRevision
};
