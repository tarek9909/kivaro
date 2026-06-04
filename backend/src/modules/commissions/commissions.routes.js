const express = require('express');
const controller = require('./commissions.controller');
const schemas = require('./commissions.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/commission-rules', '/commissions'], authenticate);

router.get('/commission-rules', requirePermission('commissions.manage'), validate(schemas.listSchema), asyncHandler(controller.listRules));
router.post('/commission-rules', requirePermission('commissions.manage'), validate(schemas.ruleCreateSchema), asyncHandler(controller.createRule));
router.patch('/commission-rules/:id', requirePermission('commissions.manage'), validate(schemas.ruleUpdateSchema), asyncHandler(controller.updateRule));
router.delete('/commission-rules/:id', requirePermission('commissions.manage'), validate(schemas.idSchema), asyncHandler(controller.deleteRule));

router.post('/commissions/calculate', requirePermission('commissions.manage'), validate(schemas.calculateSchema), asyncHandler(controller.calculate));
router.get('/commissions', requirePermission('commissions.manage'), validate(schemas.listSchema), asyncHandler(controller.listCommissions));
router.get('/commissions/:id', requirePermission('commissions.manage'), validate(schemas.idSchema), asyncHandler(controller.getCommission));
router.post('/commissions/:id/approve', requirePermission('commissions.manage'), validate(schemas.idSchema), asyncHandler(controller.approveCommission));
router.post('/commissions/:id/pay', requirePermission('commissions.manage'), validate(schemas.paySchema), asyncHandler(controller.payCommission));

module.exports = router;
