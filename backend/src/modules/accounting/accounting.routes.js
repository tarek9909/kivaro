const express = require('express');
const controller = require('./accounting.controller');
const schemas = require('./accounting.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/expense-categories', '/expenses', '/cash-accounts', '/financial-transactions', '/salesman-balances'], authenticate);

router.get('/expense-categories', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listExpenseCategories));
router.post('/expense-categories', requirePermission('accounting.manage'), validate(schemas.expenseCategorySchema), asyncHandler(controller.createExpenseCategory));
router.patch('/expense-categories/:id', requirePermission('accounting.manage'), validate(schemas.expenseCategoryUpdateSchema), asyncHandler(controller.updateExpenseCategory));
router.delete('/expense-categories/:id', requirePermission('accounting.manage'), validate(schemas.idSchema), asyncHandler(controller.deleteExpenseCategory));

router.get('/expenses', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listExpenses));
router.post('/expenses', requirePermission('accounting.manage'), validate(schemas.expenseSchema), asyncHandler(controller.createExpense));
router.get('/expenses/:id', requirePermission('accounting.view'), validate(schemas.idSchema), asyncHandler(controller.getExpense));
router.patch('/expenses/:id', requirePermission('accounting.manage'), validate(schemas.expenseUpdateSchema), asyncHandler(controller.updateExpense));
router.delete('/expenses/:id', requirePermission('accounting.manage'), validate(schemas.idSchema), asyncHandler(controller.deleteExpense));

router.get('/cash-accounts', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listCashAccounts));
router.post('/cash-accounts', requirePermission('accounting.manage'), validate(schemas.cashAccountSchema), asyncHandler(controller.createCashAccount));
router.patch('/cash-accounts/:id', requirePermission('accounting.manage'), validate(schemas.cashAccountUpdateSchema), asyncHandler(controller.updateCashAccount));

router.get('/financial-transactions', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listFinancialTransactions));

router.get('/salesman-balances', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listSalesmanBalances));
router.get('/salesman-balances/:id', requirePermission('accounting.view'), validate(schemas.idSchema), asyncHandler(controller.getSalesmanBalance));
router.post('/salesman-balances/:id/close', requirePermission('accounting.manage'), validate(schemas.idSchema), asyncHandler(controller.closeSalesmanBalance));

module.exports = router;
