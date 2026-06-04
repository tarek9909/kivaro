const inventoryService = require('./inventory.service');
const { successResponse } = require('../../utils/response');

function listHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const result = await serviceMethod(req.query, req.user);

    return successResponse(res, {
      message,
      data: {
        [resourceName]: result[resourceName]
      },
      meta: result.meta
    });
  };
}

function getHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const resource = await serviceMethod(req.params.id, req.user);

    return successResponse(res, {
      message,
      data: {
        [resourceName]: resource
      }
    });
  };
}

function createHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const resource = await serviceMethod(req.body, req.user.id, req.user);

    return successResponse(res, {
      statusCode: 201,
      message,
      data: {
        [resourceName]: resource
      }
    });
  };
}

function updateHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const resource = await serviceMethod(req.params.id, req.body, req.user);

    return successResponse(res, {
      message,
      data: {
        [resourceName]: resource
      }
    });
  };
}

function deleteHandler(serviceMethod, message) {
  return async (req, res) => {
    await serviceMethod(req.params.id, req.user);

    return successResponse(res, {
      message,
      data: {}
    });
  };
}

async function adjustStock(req, res) {
  const adjustment = await inventoryService.adjustStock(req.body, req.user.id, req.audit, req.user);

  return successResponse(res, {
    statusCode: 201,
    message: 'Stock adjusted',
    data: {
      adjustment
    }
  });
}

module.exports = {
  adjustStock,
  createCategory: createHandler(inventoryService.createCategory, 'category', 'Category created'),
  createItem: createHandler(inventoryService.createItem, 'item', 'Item created'),
  createUnit: createHandler(inventoryService.createUnit, 'unit', 'Unit created'),
  createVariant: createHandler(inventoryService.createVariant, 'item_variant', 'Item variant created'),
  createWarehouse: createHandler(inventoryService.createWarehouse, 'warehouse', 'Warehouse created'),
  deleteCategory: deleteHandler(inventoryService.deleteCategory, 'Category deleted'),
  hardDeleteCategory: deleteHandler(inventoryService.hardDeleteCategory, 'Category hard-deleted'),
  deleteItem: deleteHandler(inventoryService.deleteItem, 'Item deleted'),
  hardDeleteItem: deleteHandler(inventoryService.hardDeleteItem, 'Item hard-deleted'),
  deleteUnit: deleteHandler(inventoryService.deleteUnit, 'Unit deleted'),
  deleteVariant: deleteHandler(inventoryService.deleteVariant, 'Item variant deleted'),
  hardDeleteVariant: deleteHandler(inventoryService.hardDeleteVariant, 'Item variant hard-deleted'),
  deleteWarehouse: deleteHandler(inventoryService.deleteWarehouse, 'Warehouse deleted'),
  getCategory: getHandler(inventoryService.getCategory, 'category', 'Category fetched'),
  getItem: getHandler(inventoryService.getItem, 'item', 'Item fetched'),
  getUnit: getHandler(inventoryService.getUnit, 'unit', 'Unit fetched'),
  getVariant: getHandler(inventoryService.getVariant, 'item_variant', 'Item variant fetched'),
  getWarehouse: getHandler(inventoryService.getWarehouse, 'warehouse', 'Warehouse fetched'),
  listCategories: listHandler(inventoryService.listCategories, 'categories', 'Categories fetched'),
  listItems: listHandler(inventoryService.listItems, 'items', 'Items fetched'),
  listStockBalances: listHandler(inventoryService.listStockBalances, 'stock_balances', 'Stock balances fetched'),
  listStockMovements: listHandler(inventoryService.listStockMovements, 'stock_movements', 'Stock movements fetched'),
  listUnits: listHandler(inventoryService.listUnits, 'units', 'Units fetched'),
  listVariants: listHandler(inventoryService.listVariants, 'item_variants', 'Item variants fetched'),
  listWarehouses: listHandler(inventoryService.listWarehouses, 'warehouses', 'Warehouses fetched'),
  updateCategory: updateHandler(inventoryService.updateCategory, 'category', 'Category updated'),
  updateItem: updateHandler(inventoryService.updateItem, 'item', 'Item updated'),
  updateUnit: updateHandler(inventoryService.updateUnit, 'unit', 'Unit updated'),
  updateVariant: updateHandler(inventoryService.updateVariant, 'item_variant', 'Item variant updated'),
  updateWarehouse: updateHandler(inventoryService.updateWarehouse, 'warehouse', 'Warehouse updated')
};
