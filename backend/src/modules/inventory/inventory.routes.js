const express = require('express');
const inventoryController = require('./inventory.controller');
const inventorySchemas = require('./inventory.schema');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const { requireAnyPermission, requirePermission } = require('../../middleware/permission.middleware');

const router = express.Router();

// Movement and adjustment users need a safe, active-only selector list to
// complete the UI flows they are already allowed to perform. Full catalogue
// browsing remains under inventory.view.
function requireInventoryPickerRead(req, res, next) {
  const permissions = new Set(req.user?.permissions || []);
  const canView = req.user?.is_superadmin || permissions.has('*') || permissions.has('inventory.view');
  if (canView) return next();
  const canManageCatalog = permissions.has('inventory.create') || permissions.has('inventory.update') || permissions.has('inventory.delete');
  if (canManageCatalog) return next();
  const canUsePicker = permissions.has('stock.adjust') || permissions.has('stock.movements');
  if (canUsePicker && String(req.query?.picker) === 'true') {
    req.query.status = 'active';
    req.query.limit = Math.min(Number(req.query.limit) || 100, 100);
    return next();
  }
  return requireAnyPermission('inventory.view')(req, res, next);
}

function requireInventoryCatalogRead(req, res, next) {
  return requireAnyPermission('inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete')(req, res, next);
}

// This router is mounted at the API root. Scope authentication to inventory
// resources so an unrelated or unknown API path can reach the normalized
// 404 handler instead of being intercepted as an inventory request.
router.use([
  '/item-categories',
  '/units',
  '/items',
  '/warehouses',
  '/stock-balances',
  '/stock-movements',
  '/stock-adjustments',
  '/stock-receipts',
  '/carton-lots',
], authenticate);

router.get('/item-categories', requireInventoryCatalogRead, validate(inventorySchemas.listCategorySchema), asyncHandler(inventoryController.listCategories));
router.post('/item-categories', requirePermission('inventory.create'), validate(inventorySchemas.createCategorySchema), asyncHandler(inventoryController.createCategory));
router.get('/item-categories/:id', requireInventoryCatalogRead, validate(inventorySchemas.idSchema), asyncHandler(inventoryController.getCategory));
router.patch('/item-categories/:id', requirePermission('inventory.update'), validate(inventorySchemas.updateCategorySchema), asyncHandler(inventoryController.updateCategory));
router.delete('/item-categories/:id/hard', requirePermission('inventory.delete'), validate(inventorySchemas.idSchema), asyncHandler(inventoryController.hardDeleteCategory));
router.delete('/item-categories/:id', requirePermission('inventory.delete'), validate(inventorySchemas.idSchema), asyncHandler(inventoryController.deleteCategory));

router.get('/units', requireInventoryCatalogRead, validate(inventorySchemas.listUnitSchema), asyncHandler(inventoryController.listUnits));
router.post('/units', requirePermission('inventory.create'), validate(inventorySchemas.createUnitSchema), asyncHandler(inventoryController.createUnit));
router.get('/units/:id', requireInventoryCatalogRead, validate(inventorySchemas.idSchema), asyncHandler(inventoryController.getUnit));
router.patch('/units/:id', requirePermission('inventory.update'), validate(inventorySchemas.updateUnitSchema), asyncHandler(inventoryController.updateUnit));
router.delete('/units/:id', requirePermission('inventory.delete'), validate(inventorySchemas.idSchema), asyncHandler(inventoryController.deleteUnit));

router.get('/items', requireInventoryPickerRead, validate(inventorySchemas.listItemSchema), asyncHandler(inventoryController.listItems));
router.post('/items', requirePermission('inventory.create'), validate(inventorySchemas.createItemSchema), asyncHandler(inventoryController.createItem));
router.get('/items/:id', requireInventoryCatalogRead, validate(inventorySchemas.idSchema), asyncHandler(inventoryController.getItem));
router.patch('/items/:id', requirePermission('inventory.update'), validate(inventorySchemas.updateItemSchema), asyncHandler(inventoryController.updateItem));
router.delete('/items/:id/hard', requirePermission('inventory.delete'), validate(inventorySchemas.idSchema), asyncHandler(inventoryController.hardDeleteItem));
router.delete('/items/:id', requirePermission('inventory.delete'), validate(inventorySchemas.idSchema), asyncHandler(inventoryController.deleteItem));

router.get('/warehouses', requireInventoryPickerRead, validate(inventorySchemas.listWarehouseSchema), asyncHandler(inventoryController.listWarehouses));
router.post('/warehouses', requirePermission('inventory.create'), validate(inventorySchemas.createWarehouseSchema), asyncHandler(inventoryController.createWarehouse));
router.get('/warehouses/:id', requireInventoryCatalogRead, validate(inventorySchemas.idSchema), asyncHandler(inventoryController.getWarehouse));
router.patch('/warehouses/:id', requirePermission('inventory.update'), validate(inventorySchemas.updateWarehouseSchema), asyncHandler(inventoryController.updateWarehouse));
router.delete('/warehouses/:id', requirePermission('inventory.delete'), validate(inventorySchemas.idSchema), asyncHandler(inventoryController.deleteWarehouse));

router.get('/stock-balances', requirePermission('inventory.view'), validate(inventorySchemas.listStockBalanceSchema), asyncHandler(inventoryController.listStockBalances));
router.get('/stock-movements', requirePermission('stock.movements'), validate(inventorySchemas.listStockMovementSchema), asyncHandler(inventoryController.listStockMovements));
router.get('/stock-adjustments', requirePermission('stock.movements'), validate(inventorySchemas.listStockMovementSchema), asyncHandler(inventoryController.listStockAdjustments));
router.get('/carton-lots', requirePermission('inventory.view'), validate(inventorySchemas.listCartonLotSchema), asyncHandler(inventoryController.listCartonLots));
router.post('/stock-receipts', requirePermission('stock.adjust'), validate(inventorySchemas.stockReceiptSchema), asyncHandler(inventoryController.receiveStock));
router.post('/stock-adjustments', requirePermission('stock.adjust'), validate(inventorySchemas.stockAdjustmentSchema), asyncHandler(inventoryController.adjustStock));

module.exports = router;
