const express = require('express');
const permissionController = require('./permissions.controller');
const schemas = require('./permissions.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(authenticate);
router.get(
  '/',
  requirePermission('roles.manage'),
  validate(schemas.listPermissionsSchema),
  asyncHandler(permissionController.listPermissions)
);

module.exports = router;
