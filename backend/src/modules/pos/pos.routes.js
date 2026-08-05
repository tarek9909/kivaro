const express = require('express');
const controller = require('./pos.controller');
const schemas = require('./pos.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/pos', authenticate);

const POS_ACCESS = ['pos.create_own', 'pos.create_for_salesman', 'dispatch.create', 'salesman_workspace.view'];

router.get(
  '/pos/catalog',
  requireAnyPermission(...POS_ACCESS),
  validate(schemas.listCatalogSchema),
  asyncHandler(controller.listCatalog)
);
router.get(
  '/pos/territories',
  requireAnyPermission(...POS_ACCESS),
  validate(schemas.listTerritoriesSchema),
  asyncHandler(controller.listTerritories)
);
router.get(
  '/pos/customers',
  requireAnyPermission(...POS_ACCESS),
  validate(schemas.listCustomersSchema),
  asyncHandler(controller.listCustomers)
);
router.post(
  '/pos/customers',
  requireAnyPermission('pos.create_customers', 'pos.create_for_salesman'),
  validate(schemas.createCustomerSchema),
  asyncHandler(controller.createCustomer)
);

router.get(
  '/pos/workspace',
  requireAnyPermission('salesman_workspace.view', 'salesmen.manage', 'pos.create_for_salesman', 'dispatch.create'),
  validate(schemas.workspaceSchema),
  asyncHandler(controller.getWorkspace)
);
module.exports = router;
