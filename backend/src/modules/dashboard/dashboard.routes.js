const express = require('express');
const controller = require('./dashboard.controller');
const asyncHandler = require('../../utils/asyncHandler');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.get('/dashboard', authenticate, requirePermission('dashboard.view'), asyncHandler(controller.getDashboard));

module.exports = router;
