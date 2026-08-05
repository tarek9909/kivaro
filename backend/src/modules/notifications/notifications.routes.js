const express = require('express');
const controller = require('./notifications.controller');
const schemas = require('./notifications.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/notifications', authenticate);

router.get('/notifications', requireAnyPermission('dashboard.view', 'salesman_workspace.view'), validate(schemas.listSchema), asyncHandler(controller.listNotifications));
router.post('/notifications', requirePermission('settings.manage'), validate(schemas.createSchema), asyncHandler(controller.createNotification));
router.patch('/notifications/read-all', requireAnyPermission('dashboard.view', 'salesman_workspace.view'), asyncHandler(controller.markAllRead));
router.patch('/notifications/:id/read', requireAnyPermission('dashboard.view', 'salesman_workspace.view'), validate(schemas.idSchema), asyncHandler(controller.markRead));

module.exports = router;
