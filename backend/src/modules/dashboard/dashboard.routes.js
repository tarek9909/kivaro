const express = require('express');
const controller = require('./dashboard.controller');
const schemas = require('./dashboard.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.get(
  '/dashboard',
  authenticate,
  requirePermission('dashboard.view'),
  validate(schemas.dashboardSchema),
  asyncHandler(controller.getDashboard)
);

module.exports = router;
