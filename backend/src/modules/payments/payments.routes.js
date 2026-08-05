const express = require('express');
const controller = require('./payments.controller');
const schemas = require('./payments.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/customer-debts', '/customer-payments', '/customer-credits', '/customer-receipts'], authenticate);

router.get('/customer-debts', requireAnyPermission('debts.manage', 'accounting.manage'), validate(schemas.listSchema), asyncHandler(controller.listDebts));
router.get('/customer-debts/:id', requirePermission('debts.manage'), validate(schemas.idSchema), asyncHandler(controller.getDebt));
router.get('/customer-debts/:id/print', requirePermission('debts.manage'), validate(schemas.printSchema), asyncHandler(controller.printDebt));
router.post('/customer-debts/:id/payments', requirePermission('debts.manage'), validate(schemas.debtPaymentSchema), asyncHandler(controller.payDebt));
router.post('/customer-debts/:id/apply-credit', requirePermission('debts.manage'), validate(schemas.creditApplicationSchema), asyncHandler(controller.applyCreditToDebt));

router.get('/customer-payments', requireAnyPermission('accounting.view', 'accounting.manage'), validate(schemas.listSchema), asyncHandler(controller.listPayments));
router.post('/customer-payments', requirePermission('accounting.manage'), validate(schemas.paymentSchema), asyncHandler(controller.createPayment));
router.get('/customer-payments/:id/print', requireAnyPermission('accounting.view', 'accounting.manage'), validate(schemas.printSchema), asyncHandler(controller.printPayment));

router.get('/customer-credits', requireAnyPermission('accounting.view', 'debts.manage'), validate(schemas.listSchema), asyncHandler(controller.listCredits));

router.get('/customer-receipts', requireAnyPermission('dispatch.print', 'debts.manage', 'accounting.view', 'accounting.manage'), validate(schemas.listSchema), asyncHandler(controller.listReceipts));
router.get('/customer-receipts/:id', requireAnyPermission('dispatch.print', 'debts.manage', 'accounting.view', 'accounting.manage'), validate(schemas.idSchema), asyncHandler(controller.getReceipt));
router.get('/customer-receipts/:id/print', requireAnyPermission('dispatch.print', 'debts.manage', 'accounting.view', 'accounting.manage'), validate(schemas.printSchema), asyncHandler(controller.printReceipt));

module.exports = router;
