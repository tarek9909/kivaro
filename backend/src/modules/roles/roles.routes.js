const express = require('express');
const roleController = require('./roles.controller');
const roleSchemas = require('./roles.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('roles.manage'),
  validate(roleSchemas.listRolesSchema),
  asyncHandler(roleController.listRoles)
);
router.post(
  '/',
  requirePermission('roles.manage'),
  validate(roleSchemas.createRoleSchema),
  asyncHandler(roleController.createRole)
);
router.get(
  '/:id',
  requirePermission('roles.manage'),
  validate(roleSchemas.roleIdSchema),
  asyncHandler(roleController.getRole)
);
router.patch(
  '/:id',
  requirePermission('roles.manage'),
  validate(roleSchemas.updateRoleSchema),
  asyncHandler(roleController.updateRole)
);
router.delete(
  '/:id',
  requirePermission('roles.manage'),
  validate(roleSchemas.roleIdSchema),
  asyncHandler(roleController.deleteRole)
);
router.put(
  '/:id/permissions',
  requirePermission('roles.manage'),
  validate(roleSchemas.replaceRolePermissionsSchema),
  asyncHandler(roleController.replaceRolePermissions)
);

module.exports = router;
