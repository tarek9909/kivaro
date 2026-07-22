const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const model = require('./accounting.model');

async function mustFind(method, id, message, actor = {}) {
  const row = await method(id);
  return assertRowInScope(row, actor, message);
}

async function createExpense(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const category = await mustFind(model.findExpenseCategoryById, scoped.expense_category_id, 'Expense category not found', actor);
  assertSameStore(category, scoped.store_id, 'expense_category_id', 'Expense category does not belong to this store');

  if (!scoped.cash_account_id) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'Cash account is required' }
    ]);
  }
  const account = await mustFind(model.findCashAccountById, scoped.cash_account_id, 'Cash account not found', actor);
  assertSameStore(account, scoped.store_id, 'cash_account_id', 'Cash account does not belong to this store');
  if (account.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'Cash account must be active' }
    ]);
  }
  const capability = account.cash_flow_permission || 'both';
  if (!['outgoing', 'both'].includes(capability)) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'Cash account does not allow outgoing payments' }
    ]);
  }

  return withTransaction(async (connection) => {
    const expense = await model.createExpense({ ...scoped, created_by: userId }, connection);
    await model.createFinancialTransaction(connection, {
      store_id: scoped.store_id,
      cash_account_id: scoped.cash_account_id,
      transaction_type: 'expense',
      direction: 'out',
      transaction_date: scoped.expense_date,
      amount: scoped.amount,
      reference_type: 'expense',
      reference_id: expense.id,
      description: scoped.description,
      created_by: userId
    });

    return expense;
  });
}

async function validateExpenseCashAccount(cashAccountId, storeId, actor = {}) {
  if (!cashAccountId) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'Cash account is required' }
    ]);
  }

  const account = await mustFind(model.findCashAccountById, cashAccountId, 'Cash account not found', actor);
  assertSameStore(account, storeId, 'cash_account_id', 'Cash account does not belong to this store');
  if (account.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'Cash account must be active' }
    ]);
  }
  const capability = account.cash_flow_permission || 'both';
  if (!['outgoing', 'both'].includes(capability)) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'cash_account_id', message: 'Cash account does not allow outgoing payments' }
    ]);
  }

  return account;
}

async function closeSalesmanBalance(id, userId, actor = {}) {
  const balance = await mustFind(model.findSalesmanBalanceById, id, 'Salesman balance not found', actor);
  if (balance.status === 'closed') {
    throw ApiError.conflict('Salesman balance is already closed');
  }

  const closed = await model.closeSalesmanBalance(id, userId);
  if (!closed) {
    throw ApiError.conflict('Salesman balance is already closed');
  }
  return closed;
}

function assertExpenseActive(expense) {
  if (expense.status === 'voided') {
    throw ApiError.conflict('Voided expenses cannot be edited or deleted');
  }
}

async function reverseExpenseTransaction(connection, expense, transaction, userId, reason) {
  const amount = decimal(transaction?.amount || expense.amount || 0);
  const cashAccountId = transaction?.cash_account_id || expense.cash_account_id;

  if (!cashAccountId || amount.lte(0)) return;

  await model.createFinancialTransaction(connection, {
    store_id: expense.store_id,
    cash_account_id: cashAccountId,
    transaction_type: 'manual_adjustment',
    direction: 'in',
    amount: toMoney(amount),
    reference_type: 'expense',
    reference_id: expense.id,
    description: reason,
    created_by: userId,
    allow_inactive_cash_account: true
  });
}

module.exports = {
  closeSalesmanBalance,
  createCashAccount: (data, userId, actor = {}) => {
    const scoped = scopedData(data, actor);
    return model.createCashAccount({
      ...scoped,
      current_balance: scoped.opening_balance || 0
    });
  },
  createExpense,
  createExpenseCategory: (data, userId, actor = {}) => model.createExpenseCategory(scopedData(data, actor)),
  deleteExpense: async (id, actor = {}) => {
    return withTransaction(async (connection) => {
      const locked = await model.lockExpenseById(connection, id);
      const expense = assertRowInScope(locked, actor, 'Expense not found');
      assertExpenseActive(expense);
      const transaction = await model.findLatestPostedExpenseTransaction(id, connection);
      await reverseExpenseTransaction(connection, expense, transaction, actor.id, `Expense ${id} voided`);
      return model.updateExpense(id, {
        status: 'voided',
        voided_at: new Date(),
        voided_by: actor.id
      }, connection);
    });
  },
  deleteExpenseCategory: async (id, actor = {}) => {
    await mustFind(model.findExpenseCategoryById, id, 'Expense category not found', actor);
    await model.deleteExpenseCategory(id);
  },
  getExpense: (id, actor = {}) => mustFind(model.findExpenseById, id, 'Expense not found', actor),
  getSalesmanBalance: (id, actor = {}) => mustFind(model.findSalesmanBalanceById, id, 'Salesman balance not found', actor),
  listCashAccounts: (query, actor = {}) => model.listCashAccounts(scopedQuery(query, actor)),
  listExpenseCategories: (query, actor = {}) => model.listExpenseCategories(scopedQuery(query, actor)),
  listExpenses: (query, actor = {}) => model.listExpenses(scopedQuery(query, actor)),
  listFinancialTransactions: (query, actor = {}) => model.listFinancialTransactions(scopedQuery(query, actor)),
  listSalesmanBalances: (query, actor = {}) => model.listSalesmanBalances(scopedQuery(query, actor)),
  updateCashAccount: async (id, data, actor = {}) => {
    await mustFind(model.findCashAccountById, id, 'Cash account not found', actor);
    const { store_id, current_balance, opening_balance, ...updates } = data;
    return model.updateCashAccount(id, updates);
  },
  updateExpense: async (id, data, actor = {}) => {
    const expense = await mustFind(model.findExpenseById, id, 'Expense not found', actor);
    assertExpenseActive(expense);
    if (data.expense_category_id) {
      const category = await mustFind(model.findExpenseCategoryById, data.expense_category_id, 'Expense category not found', actor);
      assertSameStore(category, expense.store_id, 'expense_category_id', 'Expense category does not belong to this store');
    }
    const currentTransaction = await model.findLatestPostedExpenseTransaction(id);
    const cashAccountId = data.cash_account_id || expense.cash_account_id || currentTransaction?.cash_account_id;
    await validateExpenseCashAccount(cashAccountId, expense.store_id, actor);
    const { store_id, ...updates } = data;
    const next = {
      ...expense,
      ...updates,
      cash_account_id: cashAccountId
    };

    return withTransaction(async (connection) => {
      const locked = await model.lockExpenseById(connection, id);
      assertRowInScope(locked, actor, 'Expense not found');
      assertExpenseActive(locked);
      const transaction = await model.findLatestPostedExpenseTransaction(id, connection);
      await reverseExpenseTransaction(connection, locked, transaction, actor.id, `Expense ${id} edited`);

      const updated = await model.updateExpense(id, {
        expense_category_id: next.expense_category_id,
        expense_date: next.expense_date,
        amount: next.amount,
        payment_method: next.payment_method,
        cash_account_id: next.cash_account_id,
        reference_number: next.reference_number,
        description: next.description
      }, connection);

      await model.createFinancialTransaction(connection, {
        store_id: expense.store_id,
        cash_account_id: next.cash_account_id,
        transaction_type: 'expense',
        direction: 'out',
        transaction_date: next.expense_date,
        amount: next.amount,
        reference_type: 'expense',
        reference_id: id,
        description: next.description,
        created_by: actor.id
      });

      return updated;
    });
  },
  updateExpenseCategory: async (id, data, actor = {}) => {
    await mustFind(model.findExpenseCategoryById, id, 'Expense category not found', actor);
    const { store_id, ...updates } = data;
    return model.updateExpenseCategory(id, updates);
  }
};
