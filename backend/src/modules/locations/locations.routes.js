const express = require('express');
const controller = require('./locations.controller');
const schemas = require('./locations.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

router.use(['/locations', '/sublocations', '/salesmen', '/location-targets', '/sublocation-targets'], authenticate);

router.get('/locations', requirePermission('locations.manage'), validate(schemas.listSchema), asyncHandler(controller.listLocations));
router.post('/locations', requirePermission('locations.manage'), validate(schemas.createLocationSchema), asyncHandler(controller.createLocation));
router.get('/locations/:id', requirePermission('locations.manage'), validate(schemas.idSchema), asyncHandler(controller.getLocation));
router.patch('/locations/:id', requirePermission('locations.manage'), validate(schemas.updateLocationSchema), asyncHandler(controller.updateLocation));
router.delete('/locations/:id', requirePermission('locations.manage'), validate(schemas.idSchema), asyncHandler(controller.deleteLocation));
router.get('/locations/:id/sublocations', requirePermission('locations.manage'), validate(schemas.idSchema), asyncHandler(controller.listLocationSublocations));

router.get('/sublocations', requirePermission('locations.manage'), validate(schemas.listSchema), asyncHandler(controller.listSublocations));
router.post('/sublocations', requirePermission('locations.manage'), validate(schemas.createSublocationSchema), asyncHandler(controller.createSublocation));
router.patch('/sublocations/:id', requirePermission('locations.manage'), validate(schemas.updateSublocationSchema), asyncHandler(controller.updateSublocation));
router.delete('/sublocations/:id', requirePermission('locations.manage'), validate(schemas.idSchema), asyncHandler(controller.deleteSublocation));

router.get('/salesmen', requirePermission('salesmen.manage'), validate(schemas.listSchema), asyncHandler(controller.listSalesmen));
router.post('/salesmen', requirePermission('salesmen.manage'), validate(schemas.createSalesmanSchema), asyncHandler(controller.createSalesman));
router.get('/salesmen/:id/sublocations', requirePermission('salesmen.manage'), validate(schemas.idSchema), asyncHandler(controller.listSalesmanSublocations));
router.get('/salesmen/:id', requirePermission('salesmen.manage'), validate(schemas.idSchema), asyncHandler(controller.getSalesman));
router.patch('/salesmen/:id', requirePermission('salesmen.manage'), validate(schemas.updateSalesmanSchema), asyncHandler(controller.updateSalesman));
router.delete('/salesmen/:id', requirePermission('salesmen.manage'), validate(schemas.idSchema), asyncHandler(controller.deleteSalesman));
router.post('/salesmen/:id/sublocations', requirePermission('salesmen.manage'), validate(schemas.assignSchema), asyncHandler(controller.assignSalesmanSublocation));
router.delete('/salesmen/:id/sublocations/:sublocationId', requirePermission('salesmen.manage'), validate(schemas.salesmanSublocationIdSchema), asyncHandler(controller.unassignSalesmanSublocation));

router.get('/location-targets', requirePermission('targets.manage'), validate(schemas.listSchema), asyncHandler(controller.listLocationTargets));
router.post('/location-targets', requirePermission('targets.manage'), validate(schemas.createLocationTargetSchema), asyncHandler(controller.createLocationTarget));
router.get('/location-targets/:id', requirePermission('targets.manage'), validate(schemas.idSchema), asyncHandler(controller.getLocationTarget));
router.patch('/location-targets/:id', requirePermission('targets.manage'), validate(schemas.updateLocationTargetSchema), asyncHandler(controller.updateLocationTarget));
router.post('/location-targets/:id/sublocation-targets', requirePermission('targets.manage'), validate(schemas.sublocationTargetSchema), asyncHandler(controller.createSublocationTarget));
router.post('/sublocation-targets/:id/generate-salesman-targets', requirePermission('targets.manage'), validate(schemas.idSchema), asyncHandler(controller.generateSalesmanTargets));

module.exports = router;
