const express = require('express');
const controller = require('./dispatch.controller');
const schemas = require('./dispatch.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();
const DISPATCH_READ = ['dispatch.view', 'dispatch.create', 'dispatch.approve', 'dispatch.settle', 'dispatch.print', 'salesman_workspace.view'];

router.use(['/dispatch-requests', '/dispatch-customers', '/dispatch-items', '/dispatch-settlements', '/invoices'], authenticate);

router.get('/invoices', requireAnyPermission('invoices.view', ...DISPATCH_READ), validate(schemas.invoiceListSchema), asyncHandler(controller.listInvoices));
router.get('/invoices/:id/pdf', requireAnyPermission('invoices.print', 'dispatch.print'), validate(schemas.idSchema), asyncHandler(controller.generateInvoicePdf));
router.get('/invoices/:id', requireAnyPermission('invoices.view', ...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.getInvoice));

router.get('/dispatch-requests', requireAnyPermission(...DISPATCH_READ), validate(schemas.listSchema), asyncHandler(controller.listDispatches));
router.post('/dispatch-requests', requirePermission('dispatch.create'), validate(schemas.createDispatchSchema), asyncHandler(controller.createDispatch));
router.post('/dispatch-requests/from-pos', requirePermission('pos.accept'), validate(schemas.createFromPosSchema), asyncHandler(controller.createDispatchFromPos));
router.get('/dispatch-requests/:id', requireAnyPermission(...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.getDispatch));
router.patch('/dispatch-requests/:id', requirePermission('dispatch.create'), validate(schemas.updateDispatchSchema), asyncHandler(controller.updateDispatch));
router.post('/dispatch-requests/:id/customers', requirePermission('dispatch.create'), validate(schemas.addCustomerSchema), asyncHandler(controller.addCustomer));
router.post('/dispatch-customers/:id/items', requirePermission('dispatch.create'), validate(schemas.addItemSchema), asyncHandler(controller.addItem));
router.patch('/dispatch-items/:id', requirePermission('dispatch.create'), validate(schemas.updateItemSchema), asyncHandler(controller.updateItem));
router.delete('/dispatch-items/:id', requirePermission('dispatch.create'), validate(schemas.idSchema), asyncHandler(controller.deleteItem));
router.post('/dispatch-requests/:id/submit', requirePermission('dispatch.create'), validate(schemas.idSchema), asyncHandler(controller.submitDispatch));
router.post('/dispatch-requests/:id/rework', requirePermission('dispatch.create'), validate(schemas.reworkSchema), asyncHandler(controller.reworkDispatch));
router.get('/dispatch-requests/:id/documents/customer-table', requireAnyPermission('dispatch.print', 'invoices.print'), validate(schemas.idSchema), asyncHandler(controller.generateCustomerChecklist));
router.get('/dispatch-requests/:id/documents/quantity-table', requireAnyPermission('dispatch.print', 'invoices.print'), validate(schemas.idSchema), asyncHandler(controller.generateQuantityTable));
router.post('/dispatch-requests/:id/approve', requirePermission('dispatch.approve'), validate(schemas.idSchema), asyncHandler(controller.approveDispatch));
router.post('/dispatch-requests/:id/dispatch', requirePermission('dispatch.approve'), validate(schemas.idSchema), asyncHandler(controller.dispatchStock));
router.post('/dispatch-requests/:id/cancel', requirePermission('dispatch.create'), validate(schemas.idSchema), asyncHandler(controller.cancelDispatch));
router.post('/dispatch-requests/:id/returns', requireAnyPermission('dispatch.settle', 'salesman_workspace.view'), validate(schemas.createReturnSchema), asyncHandler(controller.createReturn));
router.post('/dispatch-requests/:id/closeout', requireAnyPermission('dispatch.settle', 'salesman_workspace.view'), validate(schemas.closeoutSchema), asyncHandler(controller.createCloseout));
router.get('/dispatch-requests/:id/settlements', requireAnyPermission(...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.listSettlements));

router.get('/dispatch-settlements/:id', requireAnyPermission(...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.getSettlement));
router.post('/dispatch-settlements/:id/post', requirePermission('dispatch.settle'), validate(schemas.postSettlementSchema), asyncHandler(controller.postSettlement));
router.post('/dispatch-settlements/:id/complete', requirePermission('dispatch.settle'), validate(schemas.postSettlementSchema), asyncHandler(controller.postSettlement));

module.exports = router;
