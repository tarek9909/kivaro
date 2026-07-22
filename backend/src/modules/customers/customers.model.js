const { findById, insertRecord, listRecords, updateRecord } = require('../../utils/crud');
const { query } = require('../../bootstrap/db');

async function listCustomers(input) {
  return listRecords({
    select: `SELECT
      c.id, c.customer_code, c.name, c.phone, c.secondary_phone, c.location_id,
      l.name AS location_name, c.sublocation_id, sl.name AS sublocation_name,
      c.assigned_salesman_id, s.full_name AS assigned_salesman_name, c.address,
      c.detailed_address, c.notes, c.status, c.store_id, c.created_by, c.created_at, c.updated_at`,
    from: 'customers c',
    joins: `
      JOIN locations l ON l.id = c.location_id
      JOIN sublocations sl ON sl.id = c.sublocation_id
      LEFT JOIN salesmen s ON s.id = c.assigned_salesman_id`,
    filters: [
      { key: 'status', column: 'c.status' },
      { key: 'location_id', column: 'c.location_id' },
      { key: 'sublocation_id', column: 'c.sublocation_id' },
      { key: 'salesman_id', column: 'c.assigned_salesman_id' },
      { key: 'store_id', column: 'c.store_id' },
      { key: 'search', type: 'search', fields: ['c.name', 'c.customer_code', 'c.phone', 'c.address'] }
    ],
    orderBy: 'ORDER BY c.name ASC'
  }, input);
}

async function findCustomerById(id) {
  return findById('customers', id);
}

async function createCustomer(data) {
  return insertRecord('customers', data);
}

async function updateCustomer(id, data) {
  return updateRecord('customers', id, data);
}

async function deactivateCustomer(id) {
  const result = await query('UPDATE customers SET status = ? WHERE id = ?', ['inactive', id]);
  return result.affectedRows;
}

async function countCustomerHistory(id) {
  const rows = await query(
    `SELECT
      (SELECT COUNT(*) FROM dispatch_customers WHERE customer_id = ?) +
      (SELECT COUNT(*) FROM customer_debts WHERE customer_id = ?) +
      (SELECT COUNT(*) FROM customer_payments WHERE customer_id = ?) AS total`,
    [id, id, id]
  );

  return Number(rows[0].total);
}

function exportFilters(input = {}, dateColumn = null) {
  const conditions = [];
  const params = [];

  const exact = [
    ['store_id', 'c.store_id'],
    ['status', 'c.status'],
    ['location_id', 'c.location_id'],
    ['sublocation_id', 'c.sublocation_id'],
    ['salesman_id', 'c.assigned_salesman_id']
  ];

  for (const [key, column] of exact) {
    const value = input[key];
    if (value === undefined || value === null || value === '') continue;
    conditions.push(`${column} = ?`);
    params.push(value);
  }

  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push(`(
      c.name LIKE ?
      OR c.customer_code LIKE ?
      OR c.phone LIKE ?
      OR c.secondary_phone LIKE ?
      OR c.address LIKE ?
      OR c.detailed_address LIKE ?
    )`);
    params.push(term, term, term, term, term, term);
  }

  if (dateColumn && input.date_from) {
    conditions.push(`DATE(${dateColumn}) >= ?`);
    params.push(input.date_from);
  }
  if (dateColumn && input.date_to) {
    conditions.push(`DATE(${dateColumn}) <= ?`);
    params.push(input.date_to);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

const customerDirectoryColumns = `
  c.id AS customer_id,
  c.customer_code,
  c.name AS customer_name,
  c.phone,
  c.secondary_phone,
  c.address,
  c.detailed_address,
  c.credit_limit,
  c.status AS customer_status,
  l.name AS location_name,
  sl.name AS sublocation_name,
  s.id AS assigned_salesman_id,
  s.full_name AS assigned_salesman_name,
  c.notes,
  c.created_at AS customer_created_at,
  c.updated_at AS customer_updated_at
`;

const customerDirectoryJoins = `
  JOIN locations l ON l.id = c.location_id
  JOIN sublocations sl ON sl.id = c.sublocation_id
  LEFT JOIN salesmen s ON s.id = c.assigned_salesman_id
`;

async function exportCustomerDirectory(input = {}) {
  const { where, params } = exportFilters(input, 'c.created_at');
  return query(
    `SELECT ${customerDirectoryColumns}
     FROM customers c
     ${customerDirectoryJoins}
     ${where}
     ORDER BY c.name ASC, c.id ASC`,
    params
  );
}

async function exportCustomerInvoices(input = {}) {
  const { where, params } = exportFilters(input, 'i.invoice_date');
  const invoiceConditions = [];
  const invoiceParams = [];
  if (input.invoice_status) {
    invoiceConditions.push('i.status = ?');
    invoiceParams.push(input.invoice_status);
  }
  const combinedWhere = [where.replace(/^WHERE\s+/, ''), ...invoiceConditions]
    .filter(Boolean)
    .join(' AND ');
  return query(
    `SELECT
       ${customerDirectoryColumns},
       i.id AS invoice_id,
       i.invoice_number,
       i.revision AS invoice_revision,
       i.status AS invoice_status,
       i.invoice_date,
       i.subtotal_amount AS invoice_subtotal_amount,
       i.vat_amount AS invoice_vat_amount,
       i.total_amount AS invoice_total_amount,
       dr.id AS dispatch_request_id,
       dr.dispatch_number,
       dr.request_date AS dispatch_request_date,
       dr.status AS dispatch_status,
       dispatch_salesman.full_name AS dispatch_salesman_name
     FROM invoices i
     JOIN dispatch_customers dc ON dc.id = i.dispatch_customer_id
     JOIN customers c ON c.id = dc.customer_id
     ${customerDirectoryJoins}
     JOIN dispatch_requests dr ON dr.id = i.dispatch_request_id
     JOIN salesmen dispatch_salesman ON dispatch_salesman.id = dr.salesman_id
     ${combinedWhere ? `WHERE ${combinedWhere}` : ''}
     ORDER BY i.invoice_date DESC, i.id DESC`,
    [...params, ...invoiceParams]
  );
}

async function exportCustomerReceipts(input = {}) {
  const { where, params } = exportFilters(input, 'cr.receipt_date');
  const receiptConditions = [];
  const receiptParams = [];
  if (input.receipt_type) {
    receiptConditions.push('cr.receipt_type = ?');
    receiptParams.push(input.receipt_type);
  }
  const combinedWhere = [where.replace(/^WHERE\s+/, ''), ...receiptConditions]
    .filter(Boolean)
    .join(' AND ');

  return query(
    `SELECT
       ${customerDirectoryColumns},
       cr.id AS receipt_id,
       cr.receipt_number,
       cr.receipt_type,
       cr.receipt_date,
       cr.subtotal_amount AS receipt_subtotal_amount,
       cr.vat_amount AS receipt_vat_amount,
       cr.total_amount AS receipt_total_amount,
       cr.paid_amount AS receipt_paid_amount,
       cr.remaining_amount AS receipt_remaining_amount,
       cr.printed_at AS receipt_printed_at,
       dr.id AS dispatch_request_id,
       dr.dispatch_number,
       dr.status AS dispatch_status,
       dispatch_salesman.full_name AS dispatch_salesman_name
     FROM customer_receipts cr
     JOIN customers c ON c.id = cr.customer_id
     ${customerDirectoryJoins}
     LEFT JOIN dispatch_requests dr ON dr.id = cr.dispatch_request_id
     LEFT JOIN salesmen dispatch_salesman ON dispatch_salesman.id = dr.salesman_id
     ${combinedWhere ? `WHERE ${combinedWhere}` : ''}
     ORDER BY cr.receipt_date DESC, cr.id DESC`,
    [...params, ...receiptParams]
  );
}

async function exportCustomerPayments(input = {}) {
  const { where, params } = exportFilters(input, 'cp.payment_date');
  return query(
    `SELECT
       ${customerDirectoryColumns},
       cp.id AS payment_id,
       cp.payment_number,
       cp.payment_date,
       cp.amount AS payment_amount,
       cp.payment_method,
       cp.reference_number,
       cp.notes AS payment_notes,
       ca.account_name AS cash_account_name,
       COALESCE(payment_allocations.allocated_amount, 0) AS allocated_to_debts_amount
     FROM customer_payments cp
     JOIN customers c ON c.id = cp.customer_id
     ${customerDirectoryJoins}
     LEFT JOIN cash_accounts ca ON ca.id = cp.cash_account_id
     LEFT JOIN (
       SELECT customer_payment_id, SUM(allocated_amount) AS allocated_amount
       FROM customer_payment_allocations
       GROUP BY customer_payment_id
     ) payment_allocations ON payment_allocations.customer_payment_id = cp.id
     ${where}
     ORDER BY cp.payment_date DESC, cp.id DESC`,
    params
  );
}

async function exportCustomerDebts(input = {}) {
  const { where, params } = exportFilters(input, 'cd.debt_date');
  const debtConditions = [];
  const debtParams = [];
  if (input.debt_status) {
    debtConditions.push('cd.status = ?');
    debtParams.push(input.debt_status);
  }
  const combinedWhere = [where.replace(/^WHERE\s+/, ''), ...debtConditions]
    .filter(Boolean)
    .join(' AND ');

  return query(
    `SELECT
       ${customerDirectoryColumns},
       cd.id AS debt_id,
       cd.debt_number,
       cd.debt_date,
       cd.due_date,
       cd.status AS debt_status,
       cd.subtotal_amount AS debt_subtotal_amount,
       cd.vat_amount AS debt_vat_amount,
       cd.original_amount AS debt_original_amount,
       cd.paid_amount AS debt_paid_amount,
       cd.remaining_amount AS debt_remaining_amount,
       COALESCE(debt_adjustments.adjustment_amount, 0) AS debt_adjustment_amount,
       cd.notes AS debt_notes,
       dr.id AS dispatch_request_id,
       dr.dispatch_number,
       dr.status AS dispatch_status,
       dispatch_salesman.full_name AS dispatch_salesman_name
     FROM customer_debts cd
     JOIN customers c ON c.id = cd.customer_id
     ${customerDirectoryJoins}
     LEFT JOIN dispatch_requests dr ON dr.id = cd.dispatch_request_id
     LEFT JOIN salesmen dispatch_salesman ON dispatch_salesman.id = dr.salesman_id
     LEFT JOIN (
       SELECT customer_debt_id,
         SUM(CASE WHEN adjustment_type = 'increase' THEN amount ELSE -amount END) AS adjustment_amount
       FROM customer_debt_adjustments
       GROUP BY customer_debt_id
     ) debt_adjustments ON debt_adjustments.customer_debt_id = cd.id
     ${combinedWhere ? `WHERE ${combinedWhere}` : ''}
     ORDER BY cd.debt_date DESC, cd.id DESC`,
    [...params, ...debtParams]
  );
}

async function exportCustomers(input = {}) {
  switch (input.dataset || 'directory') {
    case 'invoices':
      return exportCustomerInvoices(input);
    case 'receipts':
      return exportCustomerReceipts(input);
    case 'payments':
      return exportCustomerPayments(input);
    case 'debts':
      return exportCustomerDebts(input);
    case 'directory':
    default:
      return exportCustomerDirectory(input);
  }
}

module.exports = {
  countCustomerHistory,
  createCustomer,
  deactivateCustomer,
  exportCustomers,
  findCustomerById,
  listCustomers,
  updateCustomer,
  _private: {
    exportFilters
  }
};
