const express = require('express');
const controller = require('./notifications.controller');
const schemas = require('./notifications.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/notifications', authenticate);

router.get('/notifications', requirePermission('dashboard.view'), validate(schemas.listSchema), asyncHandler(controller.listNotifications));
router.post('/notifications', requirePermission('settings.manage'), validate(schemas.createSchema), asyncHandler(controller.createNotification));
router.patch('/notifications/read-all', requirePermission('dashboard.view'), asyncHandler(controller.markAllRead));
router.patch('/notifications/:id/read', requirePermission('dashboard.view'), validate(schemas.idSchema), asyncHandler(controller.markRead));

module.exports = router;
