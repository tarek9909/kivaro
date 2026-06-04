const express = require('express');
const healthController = require('./health.controller');
const asyncHandler = require('../../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(healthController.healthCheck));

module.exports = router;
