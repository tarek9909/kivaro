const express = require('express');
const controller = require('./purchases.controller');
const schemas = require('./purchases.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/suppliers', '/purchase-orders', '/supplier-payments'], authenticate);

router.get('/suppliers', requirePermission('purchase_orders.view'), validate(schemas.listSchema), asyncHandler(controller.listSuppliers));
router.post('/suppliers', requirePermission('purchase_orders.create'), validate(schemas.supplierCreateSchema), asyncHandler(controller.createSupplier));
router.get('/suppliers/:id', requirePermission('purchase_orders.view'), validate(schemas.idSchema), asyncHandler(controller.getSupplier));
router.patch('/suppliers/:id', requirePermission('purchase_orders.create'), validate(schemas.supplierUpdateSchema), asyncHandler(controller.updateSupplier));
router.delete('/suppliers/:id', requirePermission('purchase_orders.create'), validate(schemas.idSchema), asyncHandler(controller.deleteSupplier));

router.get('/purchase-orders', requirePermission('purchase_orders.view'), validate(schemas.listSchema), asyncHandler(controller.listPurchaseOrders));
router.post('/purchase-orders', requirePermission('purchase_orders.create'), validate(schemas.createPurchaseOrderSchema), asyncHandler(controller.createPurchaseOrder));
router.get('/purchase-orders/:id', requirePermission('purchase_orders.view'), validate(schemas.idSchema), asyncHandler(controller.getPurchaseOrder));
router.patch('/purchase-orders/:id', requirePermission('purchase_orders.create'), validate(schemas.updatePurchaseOrderSchema), asyncHandler(controller.updatePurchaseOrder));
router.post('/purchase-orders/:id/submit', requirePermission('purchase_orders.create'), validate(schemas.idSchema), asyncHandler(controller.submitPurchaseOrder));
router.post('/purchase-orders/:id/approve', requirePermission('purchase_orders.approve'), validate(schemas.idSchema), asyncHandler(controller.approvePurchaseOrder));
router.post('/purchase-orders/:id/cancel', requirePermission('purchase_orders.cancel'), validate(schemas.idSchema), asyncHandler(controller.cancelPurchaseOrder));
router.post('/purchase-orders/:id/receipts', requirePermission('purchase_orders.receive'), validate(schemas.receivePurchaseOrderSchema), asyncHandler(controller.receivePurchaseOrder));
router.get('/purchase-orders/:id/receipts', requirePermission('purchase_orders.view'), validate(schemas.idSchema), asyncHandler(controller.listPurchaseOrderReceipts));

router.get('/supplier-payments', requirePermission('accounting.view'), validate(schemas.listSchema), asyncHandler(controller.listSupplierPayments));
router.post('/supplier-payments', requirePermission('accounting.manage'), validate(schemas.supplierPaymentSchema), asyncHandler(controller.createSupplierPayment));

module.exports = router;
