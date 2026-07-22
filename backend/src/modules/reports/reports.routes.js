const express = require('express');
const controller = require('./reports.controller');
const schemas = require('./reports.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();
const report = (handler) => [validate(schemas.reportSchema), asyncHandler(handler)];

router.use('/reports', authenticate, requirePermission('reports.view'));

// current-stock is retained as the canonical all-item stock report; the
// normal/packaging routes are explicit views for the new inventory model.
router.get('/reports/current-stock', report(controller.currentStock));
router.get('/reports/normal-stock', report(controller.normalStock));
router.get('/reports/packaging-stock', report(controller.packagingStock));
router.get('/reports/ready-stock', report(controller.readyStock));
router.get('/reports/stock-movements', report(controller.stockMovements));
router.get('/reports/packaging-operations', report(controller.packagingOperations));
router.get('/reports/packaging-shortages', report(controller.packagingShortages));
router.get('/reports/dispatch-summary', report(controller.dispatchSummary));
router.get('/reports/sales', report(controller.sales));
router.get('/reports/invoices', report(controller.invoices));
router.get('/reports/gifts', report(controller.gifts));
router.get('/reports/pos-orders', report(controller.posOrders));
router.get('/reports/customer-balances', report(controller.customerBalances));
router.get('/reports/salesman-performance', report(controller.salesmanPerformance));
router.get('/reports/salesman-target-progress', report(controller.salesmanTargetProgress));
router.get('/reports/debts', report(controller.debts));
router.get('/reports/purchases', report(controller.purchases));
router.get('/reports/commissions', report(controller.commissions));
router.get('/reports/profit-loss', report(controller.profitLoss));

module.exports = router;
