const express = require('express');
const controller = require('./dispatch.controller');
const schemas = require('./dispatch.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();
const DISPATCH_READ = [
  'dispatch.view', 'dispatch.create', 'dispatch.approve', 'dispatch.settle', 'dispatch.print',
  'salesman_workspace.view', 'delivery.release', 'delivery.dispatch', 'delivery.record_returns',
  'delivery.closeout', 'finance.settle_deliveries'
];

router.use(['/dispatch-requests', '/dispatch-customers', '/dispatch-items', '/dispatch-settlements', '/invoices', '/return-credit-notes'], authenticate);

router.get('/invoices', requireAnyPermission('invoices.view', ...DISPATCH_READ), validate(schemas.invoiceListSchema), asyncHandler(controller.listInvoices));
router.get('/invoices/:id/pdf', requireAnyPermission('invoices.print', 'dispatch.print'), validate(schemas.idSchema), asyncHandler(controller.generateInvoicePdf));
router.get('/invoices/:id', requireAnyPermission('invoices.view', ...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.getInvoice));
router.get('/return-credit-notes/:id/pdf', requireAnyPermission('invoices.print', 'dispatch.print'), validate(schemas.idSchema), asyncHandler(controller.generateReturnCreditNotePdf));
router.get('/return-credit-notes/:id', requireAnyPermission('invoices.view', ...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.getReturnCreditNote));

router.get('/dispatch-requests', requireAnyPermission(...DISPATCH_READ), validate(schemas.listSchema), asyncHandler(controller.listDispatches));
router.post('/dispatch-requests', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.createDispatchSchema), asyncHandler(controller.createDispatch));
router.get('/dispatch-requests/:id', requireAnyPermission(...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.getDispatch));
router.patch('/dispatch-requests/:id', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.updateDispatchSchema), asyncHandler(controller.updateDispatch));
router.post('/dispatch-requests/:id/customers', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.addCustomerSchema), asyncHandler(controller.addCustomer));
router.post('/dispatch-customers/:id/items', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.addItemSchema), asyncHandler(controller.addItem));
router.patch('/dispatch-items/:id', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.updateItemSchema), asyncHandler(controller.updateItem));
router.delete('/dispatch-items/:id', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.idSchema), asyncHandler(controller.deleteItem));
router.post('/dispatch-requests/:id/submit', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.idSchema), asyncHandler(controller.submitDispatch));
router.post('/dispatch-requests/:id/rework', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.reworkSchema), asyncHandler(controller.reworkDispatch));
router.get('/dispatch-requests/:id/documents/customer-table', requireAnyPermission('dispatch.print', 'invoices.print'), validate(schemas.idSchema), asyncHandler(controller.generateCustomerChecklist));
router.get('/dispatch-requests/:id/customers/:customerId/delivery-document-pdf', requireAnyPermission('dispatch.print', 'invoices.print'), validate(schemas.customerReceiptSchema), asyncHandler(controller.generateCustomerDeliveryDocumentPdf));
router.post('/dispatch-requests/:id/approve', requireAnyPermission('dispatch.approve', 'delivery.release'), validate(schemas.idSchema), asyncHandler(controller.approveDispatch));
router.post('/dispatch-requests/:id/dispatch', requireAnyPermission('dispatch.approve', 'delivery.dispatch'), validate(schemas.idSchema), asyncHandler(controller.dispatchStock));
router.post('/dispatch-requests/:id/cancel', requireAnyPermission('dispatch.create', 'pos.create_own', 'pos.create_for_salesman'), validate(schemas.idSchema), asyncHandler(controller.cancelDispatch));
router.post('/dispatch-requests/:id/returns', requireAnyPermission('dispatch.settle', 'delivery.record_returns', 'salesman_workspace.view'), validate(schemas.createReturnSchema), asyncHandler(controller.createReturn));
router.post('/dispatch-requests/:id/closeout', requireAnyPermission('delivery.closeout', 'dispatch.settle', 'finance.settle_deliveries'), validate(schemas.closeoutSchema), asyncHandler(controller.createCloseout));
router.get('/dispatch-requests/:id/settlements', requireAnyPermission(...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.listSettlements));

router.get('/dispatch-settlements/:id', requireAnyPermission(...DISPATCH_READ), validate(schemas.idSchema), asyncHandler(controller.getSettlement));
router.post('/dispatch-settlements/:id/reopen', requireAnyPermission('delivery.closeout', 'dispatch.settle', 'finance.settle_deliveries'), validate(schemas.idSchema), asyncHandler(controller.reopenCloseout));
router.post('/dispatch-settlements/:id/post', requireAnyPermission('dispatch.settle', 'finance.settle_deliveries'), validate(schemas.postSettlementSchema), asyncHandler(controller.postSettlement));
router.post('/dispatch-settlements/:id/complete', requireAnyPermission('dispatch.settle', 'finance.settle_deliveries'), validate(schemas.postSettlementSchema), asyncHandler(controller.postSettlement));

module.exports = router;
