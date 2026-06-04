const express = require('express');
const controller = require('./packaging.controller');
const schemas = require('./packaging.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission, requireAnyPermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(
  ['/packaging-groups', '/packaging-group-components', '/packaging-assignments'],
  authenticate
);

router.get(
  '/packaging-groups',
  requirePermission('inventory.view'),
  validate(schemas.listGroupSchema),
  asyncHandler(controller.listGroups)
);
router.post(
  '/packaging-groups',
  requirePermission('inventory.create'),
  validate(schemas.createGroupSchema),
  asyncHandler(controller.createGroup)
);
router.get(
  '/packaging-groups/:id',
  requirePermission('inventory.view'),
  validate(schemas.idSchema),
  asyncHandler(controller.getGroup)
);
router.patch(
  '/packaging-groups/:id',
  requirePermission('inventory.update'),
  validate(schemas.updateGroupSchema),
  asyncHandler(controller.updateGroup)
);
router.delete(
  '/packaging-groups/:id/hard',
  requirePermission('inventory.delete'),
  validate(schemas.idSchema),
  asyncHandler(controller.hardDeleteGroup)
);
router.delete(
  '/packaging-groups/:id',
  requirePermission('inventory.delete'),
  validate(schemas.idSchema),
  asyncHandler(controller.deleteGroup)
);
router.post(
  '/packaging-groups/:id/components',
  requirePermission('inventory.create'),
  validate(schemas.createComponentSchema),
  asyncHandler(controller.addComponent)
);
router.post(
  '/packaging-groups/:id/calculate',
  requirePermission('inventory.view'),
  validate(schemas.calculateSchema),
  asyncHandler(controller.calculateGroup)
);

router.patch(
  '/packaging-group-components/:id',
  requirePermission('inventory.update'),
  validate(schemas.updateComponentSchema),
  asyncHandler(controller.updateComponent)
);
router.delete(
  '/packaging-group-components/:id',
  requirePermission('inventory.delete'),
  validate(schemas.idSchema),
  asyncHandler(controller.deleteComponent)
);

router.get(
  '/packaging-assignments',
  requirePermission('inventory.view'),
  validate(schemas.listAssignmentSchema),
  asyncHandler(controller.listAssignments)
);
router.post(
  '/packaging-assignments',
  requireAnyPermission('inventory.create', 'stock.adjust'),
  validate(schemas.createAssignmentSchema),
  asyncHandler(controller.createAssignment)
);
router.delete(
  '/packaging-assignments/:id/hard',
  requirePermission('inventory.delete'),
  validate(schemas.idSchema),
  asyncHandler(controller.hardDeleteAssignment)
);
router.post(
  '/packaging-assignments/:id/consume',
  requirePermission('stock.adjust'),
  validate(schemas.consumeAssignmentSchema),
  asyncHandler(controller.consumeAssignment)
);

module.exports = router;
