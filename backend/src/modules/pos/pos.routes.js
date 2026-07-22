const express = require('express');
const controller = require('./pos.controller');
const schemas = require('./pos.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/pos', authenticate);

router.get(
  '/pos/catalog',
  requirePermission('pos.own_orders'),
  validate(schemas.listCatalogSchema),
  asyncHandler(controller.listCatalog)
);
router.get(
  '/pos/territories',
  requirePermission('pos.own_orders'),
  validate(schemas.listTerritoriesSchema),
  asyncHandler(controller.listTerritories)
);
router.get(
  '/pos/customers',
  requirePermission('pos.own_orders'),
  validate(schemas.listCustomersSchema),
  asyncHandler(controller.listCustomers)
);
router.post(
  '/pos/customers',
  requirePermission('pos.create_customers'),
  validate(schemas.createCustomerSchema),
  asyncHandler(controller.createCustomer)
);

router.get(
  '/pos/orders',
  requirePermission('pos.own_orders'),
  validate(schemas.listOrdersSchema),
  asyncHandler(controller.listOrders)
);
router.get(
  '/pos/workspace',
  requirePermission('salesman_workspace.view'),
  validate(schemas.workspaceSchema),
  asyncHandler(controller.getWorkspace)
);
router.post(
  '/pos/orders',
  requirePermission('pos.own_orders'),
  validate(schemas.createOrderSchema),
  asyncHandler(controller.createOrder)
);
router.get(
  '/pos/orders/:id',
  requirePermission('pos.own_orders'),
  validate(schemas.getOrderSchema),
  asyncHandler(controller.getOrder)
);
router.patch(
  '/pos/orders/:id',
  requirePermission('pos.own_orders'),
  validate(schemas.updateOrderSchema),
  asyncHandler(controller.updateOrder)
);
router.post(
  '/pos/orders/:id/cancel',
  requirePermission('pos.own_orders'),
  validate(schemas.cancelOrderSchema),
  asyncHandler(controller.cancelOrder)
);

router.get(
  '/pos/review',
  requirePermission('pos.review'),
  validate(schemas.listReviewSchema),
  asyncHandler(controller.listReview)
);
router.post(
  '/pos/review/prepare-dispatch',
  requirePermission('pos.accept'),
  validate(schemas.prepareDispatchSchema),
  asyncHandler(controller.prepareDispatch)
);

module.exports = router;
