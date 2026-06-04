const express = require('express');
const settingsController = require('./settings.controller');
const settingsSchemas = require('./settings.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/company-profile', '/settings'], authenticate);

router.get(
  '/company-profile',
  asyncHandler(settingsController.getCompanyProfile)
);
router.patch(
  '/company-profile',
  requirePermission('settings.manage'),
  validate(settingsSchemas.updateCompanyProfileSchema),
  asyncHandler(settingsController.updateCompanyProfile)
);
router.get(
  '/settings',
  requirePermission('settings.manage'),
  asyncHandler(settingsController.listSettings)
);
router.get(
  '/settings/vat',
  requireAnyPermission('settings.manage', 'vat.view', 'vat.manage'),
  asyncHandler(settingsController.getVatSettings)
);
router.patch(
  '/settings/vat',
  requireAnyPermission('settings.manage', 'vat.manage'),
  validate(settingsSchemas.updateVatSettingsSchema),
  asyncHandler(settingsController.updateVatSettings)
);
router.patch(
  '/settings/:key',
  requirePermission('settings.manage'),
  validate(settingsSchemas.updateSettingSchema),
  asyncHandler(settingsController.updateSetting)
);

module.exports = router;
