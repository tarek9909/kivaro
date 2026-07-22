const express = require('express');
const controller = require('./customers.controller');
const schemas = require('./customers.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/customers', authenticate);

router.get('/customers', requirePermission('customers.view'), validate(schemas.listSchema), asyncHandler(controller.listCustomers));
router.get('/customers/export', requirePermission('customers.view', 'reports.export'), validate(schemas.exportSchema), asyncHandler(controller.exportCustomers));
router.post('/customers', requirePermission('customers.create'), validate(schemas.createCustomerSchema), asyncHandler(controller.createCustomer));
router.get('/customers/:id', requirePermission('customers.view'), validate(schemas.idSchema), asyncHandler(controller.getCustomer));
router.get('/customers/:id/receipts', requirePermission('customers.view'), validate(schemas.idSchema), asyncHandler(controller.listCustomerReceipts));
router.get('/customers/:id/debts', requirePermission('customers.view'), validate(schemas.idSchema), asyncHandler(controller.listCustomerDebts));
router.get('/customers/:id/payments', requirePermission('customers.view'), validate(schemas.idSchema), asyncHandler(controller.listCustomerPayments));
router.patch('/customers/:id', requirePermission('customers.update'), validate(schemas.updateCustomerSchema), asyncHandler(controller.updateCustomer));
router.delete('/customers/:id', requirePermission('customers.delete'), validate(schemas.idSchema), asyncHandler(controller.deleteCustomer));

module.exports = router;
