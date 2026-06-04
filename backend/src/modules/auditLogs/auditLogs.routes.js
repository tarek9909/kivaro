const express = require('express');
const controller = require('./auditLogs.controller');
const schemas = require('./auditLogs.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/audit-logs', authenticate, requirePermission('audit_logs.view'));

router.get('/audit-logs', validate(schemas.listSchema), asyncHandler(controller.listAuditLogs));
router.get('/audit-logs/:id', validate(schemas.idSchema), asyncHandler(controller.getAuditLog));

module.exports = router;
