const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, nullable, updateRecord } = require('../../utils/crud');

async function listDebts(input) {
  return listRecords({
    select: `SELECT cd.id, cd.customer_id, c.name AS customer_name, cd.salesman_id,
      s.full_name AS salesman_name, cd.dispatch_request_id, cd.dispatch_customer_id,
      cd.debt_date, cd.subtotal_amount, cd.vat_amount, cd.original_amount, cd.paid_amount, cd.remaining_amount,
      COALESCE(adjustments.adjustment_amount, 0) AS debt_adjustment_amount,
      CASE WHEN cd.status IN ('pending','partially_paid') THEN cd.remaining_amount ELSE 0 END AS outstanding_debt_amount,
      cd.status, cd.due_date, cd.notes, cd.store_id, cd.created_by, cd.created_at, cd.updated_at`,
    from: 'customer_debts cd',
    joins: `
      JOIN customers c ON c.id = cd.customer_id
      LEFT JOIN salesmen s ON s.id = cd.salesman_id
      LEFT JOIN (
        SELECT customer_debt_id, COALESCE(SUM(amount), 0) AS adjustment_amount
        FROM customer_debt_adjustments
        GROUP BY customer_debt_id
      ) adjustments ON adjustments.customer_debt_id = cd.id`,
    filters: [
      { key: 'customer_id', column: 'cd.customer_id' },
      { key: 'store_id', column: 'cd.store_id' },
      { key: 'salesman_id', column: 'cd.salesman_id' },
      { key: 'status', column: 'cd.status' },
      { key: 'date_from', column: 'cd.debt_date', operator: 'date_gte' },
      { key: 'date_to', column: 'cd.debt_date', operator: 'date_lte' },
      { key: 'search', type: 'search', fields: ['c.name', 's.full_name'] }
    ],
    orderBy: 'ORDER BY cd.debt_date DESC, cd.id DESC'
  }, input);
}

async function listPayments(input) {
  return listRecords({
    select: `SELECT cp.id, cp.customer_id, c.name AS customer_name, cp.customer_debt_id,
      cp.dispatch_request_id, cp.payment_date, cp.amount, cp.payment_method,
      cp.reference_number, cp.collected_by_salesman_id, s.full_name AS collected_by_salesman_name,
      cp.received_by_user_id, cp.notes, cp.store_id, cp.created_at`,
    from: 'customer_payments cp',
    joins: `
      JOIN customers c ON c.id = cp.customer_id
      LEFT JOIN salesmen s ON s.id = cp.collected_by_salesman_id`,
    filters: [
      { key: 'customer_id', column: 'cp.customer_id' },
      { key: 'store_id', column: 'cp.store_id' },
      { key: 'customer_debt_id', column: 'cp.customer_debt_id' },
      { key: 'dispatch_request_id', column: 'cp.dispatch_request_id' },
      { key: 'date_from', column: 'cp.payment_date', operator: 'date_gte' },
      { key: 'date_to', column: 'cp.payment_date', operator: 'date_lte' }
    ],
    orderBy: 'ORDER BY cp.payment_date DESC, cp.id DESC'
  }, input);
}

async function listCredits(input) {
  return listRecords({
    select: `SELECT cc.id, cc.customer_id, c.name AS customer_name, cc.direction,
      cc.amount, cc.source_payment_id, cc.customer_debt_id, cc.reference_type,
      cc.reference_id, cc.notes, cc.store_id, cc.created_at`,
    from: 'customer_credits cc',
    joins: 'JOIN customers c ON c.id = cc.customer_id',
    filters: [
      { key: 'customer_id', column: 'cc.customer_id' },
      { key: 'store_id', column: 'cc.store_id' },
      { key: 'direction', column: 'cc.direction' },
      { key: 'date_from', column: 'cc.created_at', operator: 'date_gte' },
      { key: 'date_to', column: 'cc.created_at', operator: 'date_lte' },
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
    `SELECT cd.*,
       COALESCE(adjustments.adjustment_amount, 0) AS debt_adjustment_amount,
       CASE WHEN cd.status IN ('pending','partially_paid') THEN cd.remaining_amount ELSE 0 END AS outstanding_debt_amount
     FROM customer_debts cd
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
    `SELECT *
     FROM customer_debts
     WHERE id = ?
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
  return findById('customer_receipts', id);
}

async function createDebt(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO customer_debts (
      store_id, customer_id, salesman_id, dispatch_request_id, dispatch_customer_id,
      debt_date, subtotal_amount, vat_amount, original_amount, paid_amount, remaining_amount, status,
      due_date, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_id,
      nullable(data.salesman_id),
      nullable(data.dispatch_request_id),
      nullable(data.dispatch_customer_id),
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
      store_id, customer_id, customer_debt_id, dispatch_request_id, payment_date, amount,
      payment_method, reference_number, collected_by_salesman_id, received_by_user_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_id,
      nullable(data.customer_debt_id),
      nullable(data.dispatch_request_id),
      data.payment_date,
      data.amount,
      data.payment_method || 'cash',
      nullable(data.reference_number),
      nullable(data.collected_by_salesman_id),
      nullable(data.received_by_user_id),
      nullable(data.notes)
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
      store_id, customer_id, direction, amount, source_payment_id, customer_debt_id,
      reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_id,
      data.direction || 'credit',
      data.amount,
      nullable(data.source_payment_id),
      nullable(data.customer_debt_id),
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
      store_id, customer_debt_id, customer_id, salesman_id, dispatch_request_id,
      dispatch_customer_id, adjustment_type, amount, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.customer_debt_id,
      data.customer_id,
      nullable(data.salesman_id),
      nullable(data.dispatch_request_id),
      nullable(data.dispatch_customer_id),
      data.adjustment_type,
      data.amount,
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function getCustomerCreditBalance(connection, customerId, storeId) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0) AS balance
     FROM customer_credits
     WHERE customer_id = ?
       AND store_id = ?`,
    [customerId, storeId]
  );

  return rows[0]?.balance || 0;
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
  listDebts,
  listCredits,
  listPayments,
  listReceipts,
  markReceiptPrinted,
  updateDebt
};
