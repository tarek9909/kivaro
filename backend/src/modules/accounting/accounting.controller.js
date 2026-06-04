const service = require('./accounting.service');
const { successResponse } = require('../../utils/response');

function list(method, key, message) {
  return async (req, res) => {
    const result = await method(req.query, req.user);
    successResponse(res, { message, data: { [key]: result.rows }, meta: result.meta });
  };
}

function create(method, key, message) {
  return async (req, res) => {
    const data = await method(req.body, req.user.id, req.user);
    successResponse(res, { statusCode: 201, message, data: { [key]: data } });
  };
}

function update(method, key, message) {
  return async (req, res) => {
    const data = await method(req.params.id, req.body, req.user);
    successResponse(res, { message, data: { [key]: data } });
  };
}

function remove(method, message) {
  return async (req, res) => {
    await method(req.params.id, req.user);
    successResponse(res, { message, data: {} });
  };
}

async function getExpense(req, res) {
  const expense = await service.getExpense(req.params.id, req.user);
  successResponse(res, { message: 'Expense fetched', data: { expense } });
}

async function getSalesmanBalance(req, res) {
  const salesman_balance = await service.getSalesmanBalance(req.params.id, req.user);
  successResponse(res, { message: 'Salesman balance fetched', data: { salesman_balance } });
}

async function closeSalesmanBalance(req, res) {
  const salesman_balance = await service.closeSalesmanBalance(req.params.id, req.user.id, req.user);
  successResponse(res, { message: 'Salesman balance closed', data: { salesman_balance } });
}

module.exports = {
  closeSalesmanBalance,
  createCashAccount: create(service.createCashAccount, 'cash_account', 'Cash account created'),
  createExpense: create(service.createExpense, 'expense', 'Expense created'),
  createExpenseCategory: create(service.createExpenseCategory, 'expense_category', 'Expense category created'),
  deleteExpense: remove(service.deleteExpense, 'Expense voided'),
  deleteExpenseCategory: remove(service.deleteExpenseCategory, 'Expense category deleted'),
  getExpense,
  getSalesmanBalance,
  listCashAccounts: list(service.listCashAccounts, 'cash_accounts', 'Cash accounts fetched'),
  listExpenseCategories: list(service.listExpenseCategories, 'expense_categories', 'Expense categories fetched'),
  listExpenses: list(service.listExpenses, 'expenses', 'Expenses fetched'),
  listFinancialTransactions: list(service.listFinancialTransactions, 'financial_transactions', 'Financial transactions fetched'),
  listSalesmanBalances: list(service.listSalesmanBalances, 'salesman_balances', 'Salesman balances fetched'),
  updateCashAccount: update(service.updateCashAccount, 'cash_account', 'Cash account updated'),
  updateExpense: update(service.updateExpense, 'expense', 'Expense updated'),
  updateExpenseCategory: update(service.updateExpenseCategory, 'expense_category', 'Expense category updated')
};
