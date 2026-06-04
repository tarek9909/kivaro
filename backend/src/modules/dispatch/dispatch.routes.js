const express = require('express');
const controller = require('./dispatch.controller');
const schemas = require('./dispatch.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission, requireAnyPermission } = require('../../middleware/permission.middleware');

const router = express.Router();
const DISPATCH_READ_PERMISSIONS = ['dispatch.view', 'dispatch.create', 'dispatch.approve', 'dispatch.settle', 'dispatch.print'];

router.use(['/dispatch-requests', '/dispatch-customers', '/dispatch-settlements'], authenticate);

router.get('/dispatch-requests', requireAnyPermission(...DISPATCH_READ_PERMISSIONS), validate(schemas.listSchema), asyncHandler(controller.listDispatches));
router.post('/dispatch-requests', requirePermission('dispatch.create'), validate(schemas.createDispatchSchema), asyncHandler(controller.createDispatch));
router.get('/dispatch-requests/:id', requireAnyPermission(...DISPATCH_READ_PERMISSIONS), validate(schemas.idSchema), asyncHandler(controller.getDispatch));
router.patch('/dispatch-requests/:id', requirePermission('dispatch.create'), validate(schemas.updateDispatchSchema), asyncHandler(controller.updateDispatch));
router.post('/dispatch-requests/:id/customers', requirePermission('dispatch.create'), validate(schemas.addCustomerSchema), asyncHandler(controller.addCustomer));
router.post('/dispatch-requests/:id/submit', requirePermission('dispatch.create'), validate(schemas.idSchema), asyncHandler(controller.submitDispatch));
router.post('/dispatch-requests/:id/approve', requirePermission('dispatch.approve'), validate(schemas.idSchema), asyncHandler(controller.approveDispatch));
router.post('/dispatch-requests/:id/dispatch', requirePermission('dispatch.approve'), validate(schemas.idSchema), asyncHandler(controller.dispatchStock));
router.post('/dispatch-requests/:id/cancel', requirePermission('dispatch.create'), validate(schemas.idSchema), asyncHandler(controller.cancelDispatch));
router.post('/dispatch-requests/:id/returns', requirePermission('dispatch.settle'), validate(schemas.createReturnSchema), asyncHandler(controller.createReturn));
router.get('/dispatch-requests/:id/print-summary', requirePermission('dispatch.print'), validate(schemas.idSchema), asyncHandler(controller.printDispatchSummary));
router.get('/dispatch-requests/:id/print-customer-receipts', requirePermission('dispatch.print'), validate(schemas.idSchema), asyncHandler(controller.printCustomerReceipts));
router.post('/dispatch-requests/:id/settlements', requirePermission('dispatch.settle'), validate(schemas.createSettlementSchema), asyncHandler(controller.createSettlement));
router.get('/dispatch-requests/:id/settlements', requireAnyPermission(...DISPATCH_READ_PERMISSIONS), validate(schemas.idSchema), asyncHandler(controller.listSettlements));

router.post('/dispatch-customers/:id/items', requirePermission('dispatch.create'), validate(schemas.addItemSchema), asyncHandler(controller.addItem));

router.post('/dispatch-settlements/:id/customers', requirePermission('dispatch.settle'), validate(schemas.settlementCustomerSchema), asyncHandler(controller.addSettlementCustomer));
router.get('/dispatch-settlements/:id', requireAnyPermission(...DISPATCH_READ_PERMISSIONS), validate(schemas.idSchema), asyncHandler(controller.getSettlement));
router.post('/dispatch-settlements/:id/complete', requirePermission('dispatch.settle'), validate(schemas.completeSettlementSchema), asyncHandler(controller.completeSettlement));
router.post('/dispatch-settlements/:id/cancel', requirePermission('dispatch.settle'), validate(schemas.idSchema), asyncHandler(controller.cancelSettlement));

module.exports = router;
