const express = require('express');
const controller = require('./production.controller');
const schemas = require('./production.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission, requireAnyPermission } = require('../../middleware/permission.middleware');

const router = express.Router();
const PRODUCTION_BATCH_READ_PERMISSIONS = ['production.view', 'production.create', 'production.complete'];

router.use(['/packaging-configurations', '/packaging-configuration-components', '/production-batches', '/product-cost-history'], authenticate);

router.get('/packaging-configurations', requirePermission('production.view'), validate(schemas.listSchema), asyncHandler(controller.listConfigs));
router.post('/packaging-configurations', requirePermission('production.create'), validate(schemas.configCreateSchema), asyncHandler(controller.createConfig));
router.get('/packaging-configurations/:id', requirePermission('production.view'), validate(schemas.idSchema), asyncHandler(controller.getConfig));
router.patch('/packaging-configurations/:id', requirePermission('production.create'), validate(schemas.configUpdateSchema), asyncHandler(controller.updateConfig));
router.delete('/packaging-configurations/:id', requirePermission('production.create'), validate(schemas.idSchema), asyncHandler(controller.deleteConfig));
router.post('/packaging-configurations/:id/components', requirePermission('production.create'), validate(schemas.componentCreateSchema), asyncHandler(controller.addComponent));
router.post('/packaging-configurations/:id/calculate-cost', requirePermission('production.view'), validate(schemas.calculateCostSchema), asyncHandler(controller.calculateCost));

router.patch('/packaging-configuration-components/:id', requirePermission('production.create'), validate(schemas.componentUpdateSchema), asyncHandler(controller.updateComponent));
router.delete('/packaging-configuration-components/:id', requirePermission('production.create'), validate(schemas.idSchema), asyncHandler(controller.deleteComponent));

router.get('/production-batches', requireAnyPermission(...PRODUCTION_BATCH_READ_PERMISSIONS), validate(schemas.listSchema), asyncHandler(controller.listBatches));
router.post('/production-batches', requirePermission('production.create'), validate(schemas.batchCreateSchema), asyncHandler(controller.createBatch));
router.get('/production-batches/:id', requireAnyPermission(...PRODUCTION_BATCH_READ_PERMISSIONS), validate(schemas.idSchema), asyncHandler(controller.getBatch));
router.post('/production-batches/:id/start', requirePermission('production.create'), validate(schemas.idSchema), asyncHandler(controller.startBatch));
router.post('/production-batches/:id/complete', requirePermission('production.complete'), validate(schemas.completeBatchSchema), asyncHandler(controller.completeBatch));
router.post('/production-batches/:id/cancel', requirePermission('production.create'), validate(schemas.idSchema), asyncHandler(controller.cancelBatch));

router.get('/product-cost-history', requirePermission('production.view'), validate(schemas.listSchema), asyncHandler(controller.listCostHistory));

module.exports = router;
