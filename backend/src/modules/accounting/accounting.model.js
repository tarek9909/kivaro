const { query } = require('../../bootstrap/db');
const ApiError = require('../../utils/ApiError');
const { findById, insertRecord, listRecords, nullable, updateRecord } = require('../../utils/crud');

async function listExpenseCategories(input) {
  return listRecords({
    select: 'SELECT id, store_id, name, description, status, created_at',
    from: 'expense_categories',
    filters: [
      { key: 'status', column: 'status' },
      { key: 'store_id', column: 'store_id' },
      { key: 'search', type: 'search', fields: ['name', 'description'] }
    ],
    orderBy: 'ORDER BY name ASC'
  }, input);
}

async function listExpenses(input) {
  return listRecords({
    select: `SELECT e.id, e.expense_category_id, ec.name AS expense_category_name, e.expense_date,
      e.amount, e.payment_method, e.cash_account_id, ca.account_name AS cash_account_name,
      e.description, e.reference_number, e.status, e.voided_at, e.voided_by,
      e.store_id, e.created_by, e.created_at,
      CASE WHEN e.status = 'voided' THEN 1 ELSE 0 END AS is_voided,
      EXISTS (
        SELECT 1
        FROM financial_transactions ft
        WHERE ft.reference_type = 'expense'
          AND ft.reference_id = e.id
      ) AS is_posted`,
    from: 'expenses e',
    joins: `
      JOIN expense_categories ec ON ec.id = e.expense_category_id
      LEFT JOIN cash_accounts ca ON ca.id = e.cash_account_id`,
    filters: [
      { key: 'expense_category_id', column: 'e.expense_category_id' },
      { key: 'store_id', column: 'e.store_id' },
      { key: 'date_from', column: 'e.expense_date', operator: 'date_gte' },
      { key: 'date_to', column: 'e.expense_date', operator: 'date_lte' }
    ],
    orderBy: 'ORDER BY e.expense_date DESC, e.id DESC'
  }, input);
}

async function listCashAccounts(input) {
  return listRecords({
    select: 'SELECT id, store_id, account_name, account_type, cash_flow_permission, opening_balance, current_balance, status, created_at',
    from: 'cash_accounts',
    filters: [
      { key: 'status', column: 'status' },
      { key: 'store_id', column: 'store_id' },
      { key: 'cash_flow_permission', column: 'cash_flow_permission' },
      { key: 'cash_flow_direction', column: 'cash_flow_permission', type: 'cash_flow_capability' },
      { key: 'search', type: 'search', fields: ['account_name'] }
    ],
    orderBy: 'ORDER BY account_name ASC'
  }, input);
}

async function listFinancialTransactions(input) {
  return listRecords({
    select: `SELECT ft.id, ft.cash_account_id, ca.account_name, ft.transaction_date,
      ft.transaction_type, ft.direction, ft.amount, ft.reference_type, ft.reference_id,
      ft.description, ft.store_id, ft.created_by, ft.created_at`,
    from: 'financial_transactions ft',
    joins: 'LEFT JOIN cash_accounts ca ON ca.id = ft.cash_account_id',
    filters: [
      { key: 'cash_account_id', column: 'ft.cash_account_id' },
      { key: 'store_id', column: 'ft.store_id' },
      { key: 'transaction_type', column: 'ft.transaction_type' },
      { key: 'direction', column: 'ft.direction' },
      { key: 'reference_type', column: 'ft.reference_type' },
      { key: 'date_from', column: 'ft.transaction_date', operator: 'date_gte' },
      { key: 'date_to', column: 'ft.transaction_date', operator: 'date_lte' }
    ],
    orderBy: 'ORDER BY ft.transaction_date DESC, ft.id DESC'
  }, input);
}

async function listSalesmanBalances(input) {
  return listRecords({
    select: `SELECT sb.id, sb.salesman_id, s.full_name AS salesman_name, sb.dispatch_request_id,
      dr.dispatch_number, sb.balance_date, sb.expected_amount, sb.collected_amount,
      sb.debt_amount,
      COALESCE(adjustments.debt_adjustment_amount, 0) AS debt_adjustment_amount,
      COALESCE(debts.outstanding_debt_amount, 0) AS outstanding_debt_amount,
      sb.returned_stock_value, sb.status, sb.closed_by, sb.closed_at,
      sb.notes, sb.store_id, sb.created_at`,
    from: 'salesman_balances sb',
    joins: `
      JOIN salesmen s ON s.id = sb.salesman_id
      LEFT JOIN dispatch_requests dr ON dr.id = sb.dispatch_request_id
      LEFT JOIN (
        SELECT cda.dispatch_request_id, dr_adjustments.salesman_id,
          COALESCE(SUM(cda.amount), 0) AS debt_adjustment_amount
        FROM customer_debt_adjustments cda
        LEFT JOIN dispatch_requests dr_adjustments ON dr_adjustments.id = cda.dispatch_request_id
        GROUP BY cda.dispatch_request_id, dr_adjustments.salesman_id
      ) adjustments ON adjustments.dispatch_request_id = sb.dispatch_request_id
        AND adjustments.salesman_id = sb.salesman_id
      LEFT JOIN (
        SELECT cd.dispatch_request_id, dr_debts.salesman_id,
          COALESCE(SUM(cd.remaining_amount), 0) AS outstanding_debt_amount
        FROM customer_debts cd
        LEFT JOIN dispatch_requests dr_debts ON dr_debts.id = cd.dispatch_request_id
        WHERE cd.status IN ('pending', 'partially_paid')
        GROUP BY cd.dispatch_request_id, dr_debts.salesman_id
      ) debts ON debts.dispatch_request_id = sb.dispatch_request_id
        AND debts.salesman_id = sb.salesman_id`,
    filters: [
      { key: 'salesman_id', column: 'sb.salesman_id' },
      { key: 'store_id', column: 'sb.store_id' },
      { key: 'dispatch_request_id', column: 'sb.dispatch_request_id' },
      { key: 'status', column: 'sb.status' },
      { key: 'date_from', column: 'sb.balance_date', operator: 'date_gte' },
      { key: 'date_to', column: 'sb.balance_date', operator: 'date_lte' }
    ],
    orderBy: 'ORDER BY sb.balance_date DESC, sb.id DESC'
  }, input);
}

async function findExpenseCategoryById(id) {
  return findById('expense_categories', id);
}

async function findCashAccountById(id) {
  return findById('cash_accounts', id);
}

async function findSalesmanBalanceById(id) {
  const rows = await query(
     `SELECT sb.*,
       COALESCE(adjustments.debt_adjustment_amount, 0) AS debt_adjustment_amount,
       COALESCE(debts.outstanding_debt_amount, 0) AS outstanding_debt_amount
     FROM salesman_balances sb
     LEFT JOIN (
       SELECT cda.dispatch_request_id, dr_adjustments.salesman_id,
         COALESCE(SUM(cda.amount), 0) AS debt_adjustment_amount
       FROM customer_debt_adjustments cda
       LEFT JOIN dispatch_requests dr_adjustments ON dr_adjustments.id = cda.dispatch_request_id
       GROUP BY cda.dispatch_request_id, dr_adjustments.salesman_id
     ) adjustments ON adjustments.dispatch_request_id = sb.dispatch_request_id
       AND adjustments.salesman_id = sb.salesman_id
     LEFT JOIN (
       SELECT cd.dispatch_request_id, dr_debts.salesman_id,
         COALESCE(SUM(cd.remaining_amount), 0) AS outstanding_debt_amount
       FROM customer_debts cd
       LEFT JOIN dispatch_requests dr_debts ON dr_debts.id = cd.dispatch_request_id
       WHERE cd.status IN ('pending', 'partially_paid')
       GROUP BY cd.dispatch_request_id, dr_debts.salesman_id
     ) debts ON debts.dispatch_request_id = sb.dispatch_request_id
       AND debts.salesman_id = sb.salesman_id
     WHERE sb.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function createExpenseCategory(data) {
  return insertRecord('expense_categories', data);
}

async function updateExpenseCategory(id, data) {
  return updateRecord('expense_categories', id, data);
}

async function deleteExpenseCategory(id) {
  const result = await query(
    `UPDATE expense_categories
     SET status = 'inactive'
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
}

async function createCashAccount(data) {
  return insertRecord('cash_accounts', data);
}

async function updateCashAccount(id, data) {
  return updateRecord('cash_accounts', id, data);
}

async function createExpense(data, connection = null) {
  if (connection) {
    const [result] = await connection.execute(
      `INSERT INTO expenses (
        store_id, expense_category_id, expense_date, amount, payment_method,
        cash_account_id, reference_number, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nullable(data.store_id),
        data.expense_category_id,
        data.expense_date,
        data.amount,
        data.payment_method || 'cash',
        nullable(data.cash_account_id),
        nullable(data.reference_number),
        nullable(data.description),
        nullable(data.created_by)
      ]
    );

    const [rows] = await connection.execute(
      `SELECT *
       FROM expenses
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    return rows[0] || null;
  }

  return insertRecord('expenses', data);
}

async function updateExpense(id, data, connection = null) {
  if (connection) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);

    if (entries.length > 0) {
      const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
      const params = entries.map(([, value]) => nullable(value));
      await connection.execute(
        `UPDATE expenses
         SET ${assignments}
         WHERE id = ?`,
        [...params, id]
      );
    }

    return findExpenseById(id, connection);
  }

  return updateRecord('expenses', id, data);
}

async function findExpenseById(id, connection = null) {
  const sql = `SELECT e.*,
      CASE WHEN e.status = 'voided' THEN 1 ELSE 0 END AS is_voided,
      EXISTS (
        SELECT 1
        FROM financial_transactions ft
        WHERE ft.reference_type = 'expense'
          AND ft.reference_id = e.id
      ) AS is_posted
     FROM expenses e
     WHERE e.id = ?
     LIMIT 1`;
  if (connection) {
    const [rows] = await connection.execute(sql, [id]);
    return rows[0] || null;
  }

  const rows = await query(sql, [id]);
  return rows[0] || null;
}

async function findFinancialTransactionByReference(referenceType, referenceId, connection = null) {
  const sql = `SELECT *
     FROM financial_transactions
     WHERE reference_type = ?
       AND reference_id = ?
     ORDER BY id DESC
     LIMIT 1`;
  const rows = connection
    ? (await connection.execute(sql, [referenceType, referenceId]))[0]
    : await query(sql, [referenceType, referenceId]);

  return rows[0] || null;
}

async function findLatestPostedExpenseTransaction(expenseId, connection = null) {
  const sql = `SELECT *
     FROM financial_transactions
     WHERE reference_type = 'expense'
       AND reference_id = ?
       AND transaction_type = 'expense'
       AND direction = 'out'
     ORDER BY id DESC
     LIMIT 1`;
  const rows = connection
    ? (await connection.execute(sql, [expenseId]))[0]
    : await query(sql, [expenseId]);

  return rows[0] || null;
}

async function lockExpenseById(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM expenses
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function deleteExpense(id) {
  const result = await query('DELETE FROM expenses WHERE id = ?', [id]);
  return result.affectedRows;
}

async function createFinancialTransaction(connection, data) {
  if (!data.cash_account_id && Number(data.amount || 0) > 0) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'A cash account is required for a non-zero financial transaction' }
    ]);
  }
  if (data.cash_account_id && data.store_id) {
    const [accounts] = await connection.execute(
      `SELECT id, store_id, status, cash_flow_permission
       FROM cash_accounts
       WHERE id = ?
       LIMIT 1`,
      [data.cash_account_id]
    );
    const account = accounts[0];
    if (!account || Number(account.store_id) !== Number(data.store_id)) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'cash_account_id', message: 'Cash account does not belong to this store' }
      ]);
    }
    if (account.status !== 'active' && !data.allow_inactive_cash_account) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'cash_account_id', message: 'Cash account must be active' }
      ]);
    }
    const capability = account.cash_flow_permission || 'both';
    const directionAllowed = capability === 'both'
      || (capability === 'incoming' && data.direction === 'in')
      || (capability === 'outgoing' && data.direction === 'out');
    if (!directionAllowed) {
      throw ApiError.badRequest('Validation failed', [
        {
          field: 'cash_account_id',
          message: `Cash account only permits ${capability} cash flow`
        }
      ]);
    }
  }

  const [result] = await connection.execute(
    `INSERT INTO financial_transactions (
      store_id, cash_account_id, transaction_date, transaction_type, direction, amount,
      reference_type, reference_id, description, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      nullable(data.cash_account_id),
      data.transaction_date || new Date(),
      data.transaction_type,
      data.direction,
      data.amount,
      nullable(data.reference_type),
      nullable(data.reference_id),
      nullable(data.description),
      nullable(data.created_by)
    ]
  );

  if (data.cash_account_id) {
    await connection.execute(
      `UPDATE cash_accounts
       SET current_balance = current_balance ${data.direction === 'in' ? '+' : '-'} ?
       WHERE id = ?`,
      [data.amount, data.cash_account_id]
    );
  }

  return result.insertId;
}

async function createSalesmanBalance(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO salesman_balances (
      store_id, salesman_id, dispatch_request_id, balance_date, expected_amount,
      collected_amount, debt_amount, returned_stock_value, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.salesman_id,
      nullable(data.dispatch_request_id),
      data.balance_date,
      data.expected_amount || 0,
      data.collected_amount || 0,
      data.debt_amount || 0,
      data.returned_stock_value || 0,
      data.status || 'open',
      nullable(data.notes)
    ]
  );

  return result.insertId;
}

async function closeSalesmanBalance(id, userId) {
  const result = await query(
    `UPDATE salesman_balances
     SET status = 'closed', closed_by = ?, closed_at = NOW()
     WHERE id = ?
       AND status = 'open'`,
    [userId, id]
  );

  return result.affectedRows ? findSalesmanBalanceById(id) : null;
}

module.exports = {
  closeSalesmanBalance,
  createCashAccount,
  createExpense,
  createExpenseCategory,
  createFinancialTransaction,
  createSalesmanBalance,
  deleteExpense,
  deleteExpenseCategory,
  findCashAccountById,
  findExpenseById,
  findExpenseCategoryById,
  findFinancialTransactionByReference,
  findLatestPostedExpenseTransaction,
  findSalesmanBalanceById,
  listCashAccounts,
  listExpenseCategories,
  listExpenses,
  listFinancialTransactions,
  listSalesmanBalances,
  lockExpenseById,
  updateCashAccount,
  updateExpense,
  updateExpenseCategory
};
