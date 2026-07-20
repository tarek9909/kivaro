const express = require('express');
const controller = require('./superadmin.controller');
const schemas = require('./superadmin.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use('/superadmin', authenticate, requirePermission('superadmin.manage'));

router.get('/superadmin/modules', asyncHandler(controller.listModuleCatalog));
router.get('/superadmin/platform-settings', asyncHandler(controller.getPlatformSettings));
router.patch('/superadmin/platform-settings', validate(schemas.updatePlatformSettingsSchema), asyncHandler(controller.updatePlatformSettings));
router.get('/superadmin/stores', validate(schemas.listStoresSchema), asyncHandler(controller.listStores));
router.post('/superadmin/stores', validate(schemas.createStoreSchema), asyncHandler(controller.createStore));
router.get('/superadmin/stores/slug/:slug', validate(schemas.slugParamSchema), asyncHandler(controller.getStoreBySlug));
router.get('/superadmin/stores/:id', validate(schemas.idParamSchema), asyncHandler(controller.getStore));
router.patch('/superadmin/stores/:id', validate(schemas.updateStoreSchema), asyncHandler(controller.updateStore));
router.delete('/superadmin/stores/:id', validate(schemas.idParamSchema), asyncHandler(controller.deleteStore));
router.patch('/superadmin/stores/:id/status', validate(schemas.updateStoreStatusSchema), asyncHandler(controller.updateStoreStatus));
router.post('/superadmin/stores/:id/impersonate', validate(schemas.idParamSchema), asyncHandler(controller.impersonateStore));
router.get('/superadmin/stores/:id/modules', validate(schemas.idParamSchema), asyncHandler(controller.listModules));
router.put('/superadmin/stores/:id/modules', validate(schemas.replaceModulesSchema), asyncHandler(controller.replaceModules));

module.exports = router;
