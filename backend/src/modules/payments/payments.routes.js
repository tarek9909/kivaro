const express = require('express');
const controller = require('./payments.controller');
const schemas = require('./payments.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/customer-debts', '/customer-payments', '/customer-credits', '/customer-receipts'], authenticate);

router.get('/customer-debts', requirePermission('debts.manage'), validate(schemas.listSchema), asyncHandler(controller.listDebts));
router.get('/customer-debts/:id', requirePermission('debts.manage'), validate(schemas.idSchema), asyncHandler(controller.getDebt));
router.post('/customer-debts/:id/payments', requirePermission('debts.manage'), validate(schemas.debtPaymentSchema), asyncHandler(controller.payDebt));
router.post('/customer-debts/:id/apply-credit', requirePermission('debts.manage'), validate(schemas.applyCreditSchema), asyncHandler(controller.applyCreditToDebt));
router.patch('/customer-debts/:id/status', requirePermission('debts.manage'), validate(schemas.updateDebtStatusSchema), asyncHandler(controller.updateDebtStatus));

router.get('/customer-payments', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listPayments));
router.post('/customer-payments', requirePermission('accounting.manage'), validate(schemas.paymentSchema), asyncHandler(controller.createPayment));

router.get('/customer-credits', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listCredits));

router.get('/customer-receipts', requirePermission('dispatch.print'), validate(schemas.listSchema), asyncHandler(controller.listReceipts));
router.get('/customer-receipts/:id', requirePermission('dispatch.print'), validate(schemas.idSchema), asyncHandler(controller.getReceipt));
router.get('/customer-receipts/:id/print', requirePermission('dispatch.print'), validate(schemas.idSchema), asyncHandler(controller.printReceipt));

module.exports = router;
