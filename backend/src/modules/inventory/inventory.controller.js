const inventoryService = require('./inventory.service');
const { successResponse } = require('../../utils/response');

function listHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const result = await serviceMethod(req.query, req.user);
    return successResponse(res, {
      message,
      data: { [resourceName]: result[resourceName] },
      meta: result.meta
    });
  };
}

function getHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const resource = await serviceMethod(req.params.id, req.user);
    return successResponse(res, { message, data: { [resourceName]: resource } });
  };
}

function createHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const resource = await serviceMethod(req.body, req.user.id, req.user);
    return successResponse(res, {
      statusCode: 201,
      message,
      data: { [resourceName]: resource }
    });
  };
}

function updateHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const resource = await serviceMethod(req.params.id, req.body, req.user);
    return successResponse(res, { message, data: { [resourceName]: resource } });
  };
}

function deleteHandler(serviceMethod, message) {
  return async (req, res) => {
    await serviceMethod(req.params.id, req.user);
    return successResponse(res, { message, data: {} });
  };
}

async function receiveStock(req, res) {
  const receipt = await inventoryService.receiveStock(req.body, req.user.id, req.audit, req.user);
  return successResponse(res, {
    statusCode: 201,
    message: 'Stock received',
    data: { receipt }
  });
}

async function adjustStock(req, res) {
  const adjustment = await inventoryService.adjustStock(req.body, req.user.id, req.audit, req.user);
  return successResponse(res, {
    statusCode: 201,
    message: 'Stock adjusted',
    data: { adjustment }
  });
}

module.exports = {
  adjustStock,
  createCategory: createHandler(inventoryService.createCategory, 'category', 'Category created'),
  createItem: createHandler(inventoryService.createItem, 'item', 'Item created'),
  createUnit: createHandler(inventoryService.createUnit, 'unit', 'Unit created'),
  createWarehouse: createHandler(inventoryService.createWarehouse, 'warehouse', 'Warehouse created'),
  deleteCategory: deleteHandler(inventoryService.deleteCategory, 'Category deleted'),
  hardDeleteCategory: deleteHandler(inventoryService.hardDeleteCategory, 'Category hard-deleted'),
  deleteItem: deleteHandler(inventoryService.deleteItem, 'Item deleted'),
  hardDeleteItem: deleteHandler(inventoryService.hardDeleteItem, 'Item hard-deleted'),
  deleteUnit: deleteHandler(inventoryService.deleteUnit, 'Unit deleted'),
  deleteWarehouse: deleteHandler(inventoryService.deleteWarehouse, 'Warehouse deleted'),
  getCategory: getHandler(inventoryService.getCategory, 'category', 'Category fetched'),
  getItem: getHandler(inventoryService.getItem, 'item', 'Item fetched'),
  getUnit: getHandler(inventoryService.getUnit, 'unit', 'Unit fetched'),
  getWarehouse: getHandler(inventoryService.getWarehouse, 'warehouse', 'Warehouse fetched'),
  listCartonLots: listHandler(inventoryService.listCartonLots, 'carton_lots', 'Carton lots fetched'),
  listCategories: listHandler(inventoryService.listCategories, 'categories', 'Categories fetched'),
  listItems: listHandler(inventoryService.listItems, 'items', 'Items fetched'),
  listOpenCartonShelves: listHandler(inventoryService.listOpenCartonShelves, 'open_carton_shelves', 'Open carton shelves fetched'),
  listStockAdjustments: listHandler(inventoryService.listStockAdjustments, 'stock_adjustments', 'Stock adjustments fetched'),
  listStockBalances: listHandler(inventoryService.listStockBalances, 'stock_balances', 'Stock balances fetched'),
  listStockMovements: listHandler(inventoryService.listStockMovements, 'stock_movements', 'Stock movements fetched'),
  listUnits: listHandler(inventoryService.listUnits, 'units', 'Units fetched'),
  listWarehouses: listHandler(inventoryService.listWarehouses, 'warehouses', 'Warehouses fetched'),
  receiveStock,
  updateCategory: updateHandler(inventoryService.updateCategory, 'category', 'Category updated'),
  updateItem: updateHandler(inventoryService.updateItem, 'item', 'Item updated'),
  updateUnit: updateHandler(inventoryService.updateUnit, 'unit', 'Unit updated'),
  updateWarehouse: updateHandler(inventoryService.updateWarehouse, 'warehouse', 'Warehouse updated')
};
