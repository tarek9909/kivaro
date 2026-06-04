const express = require('express');
const userController = require('./users.controller');
const userSchemas = require('./users.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  requirePermission('users.view'),
  validate(userSchemas.listUsersSchema),
  asyncHandler(userController.listUsers)
);
router.post(
  '/',
  requirePermission('users.create'),
  validate(userSchemas.createUserSchema),
  asyncHandler(userController.createUser)
);
router.get(
  '/:id',
  requirePermission('users.view'),
  validate(userSchemas.userIdSchema),
  asyncHandler(userController.getUser)
);
router.patch(
  '/:id',
  requirePermission('users.update'),
  validate(userSchemas.updateUserSchema),
  asyncHandler(userController.updateUser)
);
router.patch(
  '/:id/status',
  requirePermission('users.update'),
  validate(userSchemas.updateUserStatusSchema),
  asyncHandler(userController.updateUserStatus)
);
router.delete(
  '/:id',
  requirePermission('users.delete'),
  validate(userSchemas.userIdSchema),
  asyncHandler(userController.deleteUser)
);

module.exports = router;
