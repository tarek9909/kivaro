const express = require('express');
const controller = require('./packaging.controller');
const schemas = require('./packaging.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/packaging-groups', '/packaging-operations', '/ready-stock', '/sale-catalog'], authenticate);

router.get('/packaging-groups', requirePermission('inventory.view'), validate(schemas.listGroupSchema), asyncHandler(controller.listGroups));
router.post('/packaging-groups', requirePermission('inventory.create'), validate(schemas.createGroupSchema), asyncHandler(controller.createGroup));
router.get('/packaging-groups/:id', requirePermission('inventory.view'), validate(schemas.idSchema), asyncHandler(controller.getGroup));
router.patch('/packaging-groups/:id', requirePermission('inventory.update'), validate(schemas.updateGroupSchema), asyncHandler(controller.updateGroup));
router.delete('/packaging-groups/:id', requirePermission('inventory.delete'), validate(schemas.idSchema), asyncHandler(controller.deleteGroup));
router.put('/packaging-groups/:id/components', requirePermission('inventory.update'), validate(schemas.replaceComponentsSchema), asyncHandler(controller.replaceComponents));
router.post('/packaging-groups/:id/preview', requirePermission('inventory.view'), validate(schemas.previewSchema), asyncHandler(controller.preview));
router.post('/packaging-groups/:id/complete', requireAnyPermission('inventory.create', 'stock.adjust'), validate(schemas.completeSchema), asyncHandler(controller.complete));

router.get('/packaging-operations', requirePermission('inventory.view'), validate(schemas.listOperationSchema), asyncHandler(controller.listOperations));
router.get('/packaging-operations/:id', requirePermission('inventory.view'), validate(schemas.idSchema), asyncHandler(controller.getOperation));
router.get('/ready-stock', requirePermission('inventory.view'), validate(schemas.listReadyStockSchema), asyncHandler(controller.listReadyStock));

router.get('/sale-catalog', requireAnyPermission('inventory.view', 'dispatch.create'), validate(schemas.listCatalogSchema), asyncHandler(controller.listCatalogEntries));
router.post('/sale-catalog', requirePermission('inventory.create'), validate(schemas.catalogCreateSchema), asyncHandler(controller.createCatalogEntry));
router.get('/sale-catalog/pos', requireAnyPermission('pos.own_orders', 'pos.review', 'dispatch.create'), validate(schemas.listCatalogSchema), asyncHandler(controller.listPosCatalog));
router.get('/sale-catalog/:id', requirePermission('inventory.view'), validate(schemas.idSchema), asyncHandler(controller.getCatalogEntry));
router.patch('/sale-catalog/:id', requirePermission('inventory.update'), validate(schemas.catalogUpdateSchema), asyncHandler(controller.updateCatalogEntry));

module.exports = router;
