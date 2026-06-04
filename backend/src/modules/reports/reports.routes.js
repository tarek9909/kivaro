const express = require('express');
const controller = require('./reports.controller');
const schemas = require('./reports.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/reports', authenticate, requirePermission('reports.view'));

router.get('/reports/current-stock', validate(schemas.reportSchema), asyncHandler(controller.currentStock));
router.get('/reports/customer-balances', validate(schemas.reportSchema), asyncHandler(controller.customerBalances));
router.get('/reports/salesman-target-progress', validate(schemas.reportSchema), asyncHandler(controller.salesmanTargetProgress));
router.get('/reports/dispatch-summary', validate(schemas.reportSchema), asyncHandler(controller.dispatchSummary));
router.get('/reports/sales', validate(schemas.reportSchema), asyncHandler(controller.sales));
router.get('/reports/debts', validate(schemas.reportSchema), asyncHandler(controller.debts));
router.get('/reports/purchases', validate(schemas.reportSchema), asyncHandler(controller.purchases));
router.get('/reports/packaging-assignments', validate(schemas.reportSchema), asyncHandler(controller.packagingAssignments));
router.get('/reports/packaging-shortages', validate(schemas.reportSchema), asyncHandler(controller.packagingShortages));
router.get('/reports/stock-movements', validate(schemas.reportSchema), asyncHandler(controller.stockMovements));
router.get('/reports/profit-loss', validate(schemas.reportSchema), asyncHandler(controller.profitLoss));
router.get('/reports/commissions', validate(schemas.reportSchema), asyncHandler(controller.commissions));

module.exports = router;
