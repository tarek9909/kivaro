const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, nullable, updateRecord } = require('../../utils/crud');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

async function listDebts(input) {
  return listRecords({
    select: `SELECT cd.id, cd.customer_id, c.name AS customer_name, dr.salesman_id,
      s.full_name AS salesman_name, cd.dispatch_request_id, cd.dispatch_customer_id,
      cd.debt_date, cd.subtotal_amount, cd.vat_amount, cd.original_amount, cd.paid_amount, cd.remaining_amount,
      COALESCE(adjustments.adjustment_amount, 0) AS debt_adjustment_amount,
      CASE WHEN cd.status IN ('pending','partially_paid') THEN cd.remaining_amount ELSE 0 END AS outstanding_debt_amount,
      cd.status, cd.due_date, cd.notes, cd.store_id, cd.created_by, cd.created_at, cd.updated_at`,
    from: 'customer_debts cd',
    joins: `
      JOIN customers c ON c.id = cd.customer_id
      LEFT JOIN dispatch_requests dr ON dr.id = cd.dispatch_request_id
      LEFT JOIN salesmen s ON s.id = dr.salesman_id
      LEFT JOIN (
        SELECT customer_debt_id, COALESCE(SUM(amount), 0) AS adjustment_amount
        FROM customer_debt_adjustments
        GROUP BY customer_debt_id
      ) adjustments ON adjustments.customer_debt_id = cd.id`,
    filters: [
      { key: 'customer_id', column: 'cd.customer_id' },
      { key: 'store_id', column: 'cd.store_id' },
      { key: 'salesman_id', column: 'dr.salesman_id' },
      { key: 'status', column: 'cd.status' },
      { key: 'date_from', column: 'cd.debt_date', operator: 'date_gte' },
      { key: 'date_to', column: 'cd.debt_date', operator: 'date_lte' },
      { key: 'search', type: 'search', fields: ['c.name', 's.full_name'] }
    ],
    orderBy: 'ORDER BY cd.debt_date DESC, cd.id DESC'
  }, input);
}

function paymentListFilters(input = {}) {
  const conditions = [];
  const params = [];
  const exact = [
    ['customer_id', 'cp.customer_id'],
    ['store_id', 'cp.store_id'],
    ['salesman_id', 'cp.collected_by_salesman_id']
  ];
  for (const [key, column] of exact) {
    const value = input[key];
    if (value === undefined || value === null || value === '') continue;
    conditions.push(`${column} = ?`);
    params.push(value);
  }
  if (input.customer_debt_id) {
    conditions.push(`EXISTS (
      SELECT 1 FROM customer_payment_allocations payment_filter_allocations
      WHERE payment_filter_allocations.customer_payment_id = cp.id
        AND payment_filter_allocations.customer_debt_id = ?
    )`);
    params.push(input.customer_debt_id);
  }
  if (input.dispatch_request_id) {
    conditions.push(`EXISTS (
      SELECT 1
      FROM customer_payment_allocations payment_dispatch_allocations
      JOIN customer_debts payment_dispatch_debts
        ON payment_dispatch_debts.id = payment_dispatch_allocations.customer_debt_id
      WHERE payment_dispatch_allocations.customer_payment_id = cp.id
        AND payment_dispatch_debts.dispatch_request_id = ?
    )`);
    params.push(input.dispatch_request_id);
  }
  if (input.date_from) {
    conditions.push('cp.payment_date >= ?');
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push('cp.payment_date <= ?');
    params.push(input.date_to);
  }
  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push('(cp.payment_number LIKE ? OR c.name LIKE ? OR cp.reference_number LIKE ?)');
    params.push(term, term, term);
  }
  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

async function listPayments(input) {
  const pagination = getPagination(input);
  const { where, params } = paymentListFilters(input);
  const joins = `
    JOIN customers c ON c.id = cp.customer_id
    LEFT JOIN cash_accounts ca ON ca.id = cp.cash_account_id
    LEFT JOIN salesmen s ON s.id = cp.collected_by_salesman_id
    LEFT JOIN (
      SELECT cpa.customer_payment_id,
        MIN(cpa.customer_debt_id) AS customer_debt_id,
        MIN(cd.dispatch_request_id) AS dispatch_request_id,
        SUM(cpa.allocated_amount) AS allocated_amount,
        COUNT(*) AS allocated_debt_count
      FROM customer_payment_allocations cpa
      JOIN customer_debts cd ON cd.id = cpa.customer_debt_id
      GROUP BY cpa.customer_payment_id
    ) allocation_summary ON allocation_summary.customer_payment_id = cp.id`;
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM customer_payments cp
     JOIN customers c ON c.id = cp.customer_id
     LEFT JOIN salesmen s ON s.id = cp.collected_by_salesman_id
     ${where}`,
    params
  );
  const rows = await query(
    `SELECT cp.id, cp.customer_id, c.name AS customer_name,
       allocation_summary.customer_debt_id, allocation_summary.dispatch_request_id,
       allocation_summary.allocated_amount, allocation_summary.allocated_debt_count,
       cp.cash_account_id, ca.account_name AS cash_account_name,
       cp.payment_number, cp.payment_date, cp.amount, cp.payment_method,
       cp.reference_number, cp.collected_by_salesman_id,
       s.full_name AS collected_by_salesman_name,
       cp.created_by AS received_by_user_id, cp.notes, cp.store_id, cp.created_at
     FROM customer_payments cp
     ${joins}
     ${where}
     ORDER BY cp.payment_date DESC, cp.id DESC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(countRows[0]?.total || 0) })
  };
}

async function listCredits(input) {
  return listRecords({
    select: `SELECT cc.id, cc.customer_id, c.name AS customer_name, cc.credit_number,
      cc.credit_date, cc.original_amount, cc.used_amount, cc.remaining_amount, cc.status,
      cc.reference_type, cc.reference_id, cc.notes, cc.store_id, cc.created_by, cc.created_at`,
    from: 'customer_credits cc',
    joins: 'JOIN customers c ON c.id = cc.customer_id',
    filters: [
      { key: 'customer_id', column: 'cc.customer_id' },
      { key: 'store_id', column: 'cc.store_id' },
      { key: 'status', column: 'cc.status' },
      { key: 'date_from', column: 'cc.credit_date', operator: 'date_gte' },
      { key: 'date_to', column: 'cc.credit_date', operator: 'date_lte' },
      { key: 'search', type: 'search', fields: ['c.name', 'cc.reference_type'] }
    ],
    orderBy: 'ORDER BY cc.created_at DESC, cc.id DESC'
  }, input);
}

async function listReceipts(input) {
  return listRecords({
    select: `SELECT cr.id, cr.receipt_number, cr.customer_id, c.name AS customer_name,
      cr.dispatch_request_id, cr.dispatch_customer_id, cr.customer_payment_id,
      cr.receipt_date, cr.subtotal_amount, cr.vat_amount, cr.total_amount, cr.paid_amount, cr.remaining_amount,
      cr.receipt_type, cr.printed_at, cr.store_id, cr.created_by, cr.created_at`,
    from: 'customer_receipts cr',
    joins: 'JOIN customers c ON c.id = cr.customer_id',
    filters: [
      { key: 'customer_id', column: 'cr.customer_id' },
      { key: 'store_id', column: 'cr.store_id' },
      { key: 'dispatch_request_id', column: 'cr.dispatch_request_id' },
      { key: 'receipt_type', column: 'cr.receipt_type' },
      { key: 'date_from', column: 'cr.receipt_date', operator: 'date_gte' },
      { key: 'date_to', column: 'cr.receipt_date', operator: 'date_lte' },
      { key: 'search', type: 'search', fields: ['cr.receipt_number', 'c.name'] }
    ],
    orderBy: 'ORDER BY cr.receipt_date DESC, cr.id DESC'
  }, input);
}

async function findDebtById(id) {
  const rows = await query(
    `SELECT cd.*, dr.salesman_id,
       COALESCE(adjustments.adjustment_amount, 0) AS debt_adjustment_amount,
       CASE WHEN cd.status IN ('pending','partially_paid') THEN cd.remaining_amount ELSE 0 END AS outstanding_debt_amount
     FROM customer_debts cd
     LEFT JOIN dispatch_requests dr ON dr.id = cd.dispatch_request_id
     LEFT JOIN (
       SELECT customer_debt_id, COALESCE(SUM(amount), 0) AS adjustment_amount
       FROM customer_debt_adjustments
       GROUP BY customer_debt_id
     ) adjustments ON adjustments.customer_debt_id = cd.id
     WHERE cd.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function lockDebtById(connection, id) {
  const [rows] = await connection.execute(
    `SELECT cd.*, dr.salesman_id
     FROM customer_debts cd
     LEFT JOIN dispatch_requests dr ON dr.id = cd.dispatch_request_id
     WHERE cd.id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function findOpenDebtsForCustomer(connection, customerId, storeId, preferredDebtId = null) {
  const preferredClause = preferredDebtId ? 'ORDER BY id = ? DESC, debt_date ASC, id ASC' : 'ORDER BY debt_date ASC, id ASC';
  const params = preferredDebtId
    ? [customerId, storeId, preferredDebtId]
    : [customerId, storeId];
  const [rows] = await connection.execute(
    `SELECT *
     FROM customer_debts
     WHERE customer_id = ?
       AND store_id = ?
       AND status IN ('pending', 'partially_paid')
       AND remaining_amount > 0
     ${preferredClause}
     FOR UPDATE`,
    params
  );

  return rows;
}

async function findReceiptById(id) {
  const rows = await query(
    `SELECT cr.*, c.name AS customer_name
     FROM customer_receipts cr
     JOIN customers c ON c.id = cr.customer_id
     WHERE cr.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createDebt(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO customer_debts (
      store_id, customer_id, dispatch_request_id, dispatch_customer_id, debt_number,
      debt_date, subtotal_amount, vat_amount, original_amount, paid_amount, remaining_amount, status,
      due_date, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_id,
      nullable(data.dispatch_request_id),
      nullable(data.dispatch_customer_id),
      data.debt_number,
      data.debt_date,
      data.subtotal_amount || data.original_amount,
      data.vat_amount || 0,
      data.original_amount,
      data.paid_amount || 0,
      data.remaining_amount,
      data.status || 'pending',
      nullable(data.due_date),
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function createPayment(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO customer_payments (
      store_id, customer_id, cash_account_id, payment_number, payment_date, amount,
      payment_method, reference_number, collected_by_salesman_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_id,
      nullable(data.cash_account_id),
      data.payment_number,
      data.payment_date,
      data.amount,
      data.payment_method || 'cash',
      nullable(data.reference_number),
      nullable(data.collected_by_salesman_id),
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function createPaymentAllocation(connection, data) {
  await connection.execute(
    `INSERT INTO customer_payment_allocations (
      customer_payment_id, customer_debt_id, allocated_amount
    ) VALUES (?, ?, ?)`,
    [
      data.customer_payment_id,
      data.customer_debt_id,
      data.allocated_amount
    ]
  );
}

async function createCustomerCredit(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO customer_credits (
      store_id, customer_id, credit_number, credit_date, original_amount, used_amount,
      remaining_amount, status, reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_id,
      data.credit_number,
      data.credit_date,
      data.original_amount,
      data.used_amount || 0,
      data.remaining_amount,
      data.status || 'available',
      nullable(data.reference_type),
      nullable(data.reference_id),
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function createDebtAdjustment(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO customer_debt_adjustments (
      store_id, customer_debt_id, dispatch_request_id, adjustment_date,
      adjustment_type, amount, reason, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_debt_id,
      nullable(data.dispatch_request_id),
      data.adjustment_date,
      data.adjustment_type,
      data.amount,
      nullable(data.reason),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function getCustomerCreditBalance(connection, customerId, storeId) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(remaining_amount), 0) AS balance
     FROM customer_credits
     WHERE customer_id = ?
       AND store_id = ?
       AND status IN ('available', 'partially_used')`,
    [customerId, storeId]
  );

  return rows[0]?.balance || 0;
}

async function lockAvailableCreditsForCustomer(connection, customerId, storeId) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM customer_credits
     WHERE customer_id = ?
       AND store_id = ?
       AND status IN ('available', 'partially_used')
       AND remaining_amount > 0
     ORDER BY credit_date ASC, id ASC
     FOR UPDATE`,
    [customerId, storeId]
  );
  return rows;
}

async function updateCustomerCredit(id, data, connection = null) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length) {
    const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
    const params = entries.map(([, value]) => nullable(value));
    if (connection) {
      await connection.execute(
        `UPDATE customer_credits SET ${assignments} WHERE id = ?`,
        [...params, id]
      );
    } else {
      await query(`UPDATE customer_credits SET ${assignments} WHERE id = ?`, [...params, id]);
    }
  }

  if (connection) {
    const [rows] = await connection.execute(
      'SELECT * FROM customer_credits WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }
  const rows = await query('SELECT * FROM customer_credits WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function createReceipt(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO customer_receipts (
      store_id, receipt_number, customer_id, dispatch_request_id, dispatch_customer_id,
      customer_payment_id, receipt_date, subtotal_amount, vat_amount, total_amount, paid_amount,
      remaining_amount, receipt_type, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.receipt_number,
      data.customer_id,
      nullable(data.dispatch_request_id),
      nullable(data.dispatch_customer_id),
      nullable(data.customer_payment_id),
      data.receipt_date,
      data.subtotal_amount || data.total_amount || 0,
      data.vat_amount || 0,
      data.total_amount || 0,
      data.paid_amount || 0,
      data.remaining_amount || 0,
      data.receipt_type || 'sale',
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function updateDebt(id, data, connection = null) {
  if (connection) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);

    if (entries.length > 0) {
      const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
      const params = entries.map(([, value]) => nullable(value));
      await connection.execute(
        `UPDATE customer_debts
         SET ${assignments}
         WHERE id = ?`,
        [...params, id]
      );
    }

    const [rows] = await connection.execute(
      `SELECT *
       FROM customer_debts
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  return updateRecord('customer_debts', id, data);
}

async function markReceiptPrinted(id) {
  await query('UPDATE customer_receipts SET printed_at = NOW() WHERE id = ?', [id]);
  return findReceiptById(id);
}

module.exports = {
  createDebt,
  createPayment,
  createPaymentAllocation,
  createCustomerCredit,
  createDebtAdjustment,
  createReceipt,
  findDebtById,
  lockDebtById,
  findOpenDebtsForCustomer,
  findReceiptById,
  getCustomerCreditBalance,
  lockAvailableCreditsForCustomer,
  listDebts,
  listCredits,
  listPayments,
  listReceipts,
  markReceiptPrinted,
  updateCustomerCredit,
  updateDebt,
  _private: {
    paymentListFilters
  }
};
