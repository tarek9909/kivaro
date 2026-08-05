const express = require('express');
const controller = require('./packaging.controller');
const schemas = require('./packaging.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/packaging-groups', '/packaging-operations', '/ready-stock', '/ready-shelf-stock', '/sale-catalog'], authenticate);

const PACKAGING_READ = ['inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'stock.adjust'];

router.get('/packaging-groups', requireAnyPermission(...PACKAGING_READ), validate(schemas.listGroupSchema), asyncHandler(controller.listGroups));
router.post('/packaging-groups', requirePermission('inventory.create'), validate(schemas.createGroupSchema), asyncHandler(controller.createGroup));
router.get('/packaging-groups/:id', requireAnyPermission(...PACKAGING_READ), validate(schemas.idSchema), asyncHandler(controller.getGroup));
router.patch('/packaging-groups/:id', requirePermission('inventory.update'), validate(schemas.updateGroupSchema), asyncHandler(controller.updateGroup));
router.delete('/packaging-groups/:id', requirePermission('inventory.delete'), validate(schemas.idSchema), asyncHandler(controller.deleteGroup));
router.put('/packaging-groups/:id/components', requirePermission('inventory.update'), validate(schemas.replaceComponentsSchema), asyncHandler(controller.replaceComponents));
router.post('/packaging-groups/:id/preview', requireAnyPermission('inventory.view', 'inventory.create', 'stock.adjust'), validate(schemas.previewSchema), asyncHandler(controller.preview));
router.post('/packaging-groups/:id/complete', requireAnyPermission('inventory.create', 'stock.adjust'), validate(schemas.completeSchema), asyncHandler(controller.complete));

router.get('/packaging-operations', requireAnyPermission(...PACKAGING_READ), validate(schemas.listOperationSchema), asyncHandler(controller.listOperations));
router.get('/packaging-operations/:id', requireAnyPermission(...PACKAGING_READ), validate(schemas.idSchema), asyncHandler(controller.getOperation));
router.get('/ready-stock', requireAnyPermission(...PACKAGING_READ), validate(schemas.listReadyStockSchema), asyncHandler(controller.listReadyStock));
router.get('/ready-shelf-stock', requireAnyPermission(...PACKAGING_READ), validate(schemas.listReadyShelfStockSchema), asyncHandler(controller.listReadyShelfStock));
router.post('/ready-shelf-stock/:id/transfer-to-gift', requirePermission('inventory.update'), validate(schemas.transferShelfStockSchema), asyncHandler(controller.transferShelfStockToGift));

router.get('/sale-catalog', requireAnyPermission(...PACKAGING_READ, 'dispatch.create'), validate(schemas.listCatalogSchema), asyncHandler(controller.listCatalogEntries));
router.post('/sale-catalog', requirePermission('inventory.create'), validate(schemas.catalogCreateSchema), asyncHandler(controller.createCatalogEntry));
router.get('/sale-catalog/pos', requireAnyPermission('pos.create_own', 'pos.create_for_salesman', 'dispatch.create'), validate(schemas.listCatalogSchema), asyncHandler(controller.listPosCatalog));
router.get('/sale-catalog/:id', requireAnyPermission(...PACKAGING_READ), validate(schemas.idSchema), asyncHandler(controller.getCatalogEntry));
router.patch('/sale-catalog/:id', requirePermission('inventory.update'), validate(schemas.catalogUpdateSchema), asyncHandler(controller.updateCatalogEntry));

module.exports = router;
