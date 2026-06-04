jest.mock('../src/modules/inventory/inventory.model', () => ({
  createItem: jest.fn(),
  createItemStockBalance: jest.fn(),
  createVariant: jest.fn(),
  findCategoryById: jest.fn(),
  findItemById: jest.fn(),
  findUnitById: jest.fn(),
  findWarehouseById: jest.fn(),
  getItemStockBalanceForUpdate: jest.fn(),
  updateItemStockBalance: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({
  findLocationById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({
  adjustStock: jest.fn(),
  increaseStock: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback({ execute: jest.fn() }))
}));

const inventoryModel = require('../src/modules/inventory/inventory.model');
const stockService = require('../src/modules/inventory/stock.service');
const service = require('../src/modules/inventory/inventory.service');

describe('inventory service packaging items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inventoryModel.findCategoryById.mockResolvedValue({ id: 1, store_id: 1 });
  });

  test('requires packaging materials to use pc as their stock unit', async () => {
    inventoryModel.findUnitById.mockResolvedValue({
      id: 2,
      store_id: 1,
      symbol: 'kg',
      unit_type: 'weight'
    });

    await expect(service.createItem({
      category_id: 1,
      base_unit_id: 2,
      name: '400g bag',
      code: 'BAG-400G',
      item_type: 'packaging',
      tracking_type: 'stocked'
    }, 5, { store_id: 1 })).rejects.toMatchObject({
      statusCode: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'base_unit_id',
          message: 'Packaging materials must use pc as their stock unit'
        })
      ])
    });

    expect(inventoryModel.createItem).not.toHaveBeenCalled();
  });
});

describe('inventory service item quantity allocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inventoryModel.findCategoryById.mockResolvedValue({ id: 1, store_id: 1 });
    inventoryModel.findUnitById.mockResolvedValue({
      id: 2,
      store_id: 1,
      symbol: 'pc',
      unit_type: 'quantity',
      conversion_to_base: 1
    });
    inventoryModel.findWarehouseById.mockResolvedValue({
      id: 3,
      store_id: 1,
      status: 'active'
    });
  });

  test('creates an item with an item-level quantity pool', async () => {
    inventoryModel.createItem.mockResolvedValue({
      id: 10,
      store_id: 1,
      name: 'Retail charcoal',
      base_unit_type: 'quantity',
      base_unit_conversion_to_base: 1
    });
    inventoryModel.createItemStockBalance.mockResolvedValue({
      id: 44,
      quantity_on_hand: '100.0000'
    });

    const item = await service.createItem({
      category_id: 1,
      base_unit_id: 2,
      warehouse_id: 3,
      initial_quantity: 100,
      name: 'Retail charcoal',
      code: 'RET-CHAR',
      item_type: 'finished_product',
      tracking_type: 'stocked'
    }, 5, { store_id: 1 });

    expect(item.id).toBe(10);
    expect(inventoryModel.createItemStockBalance).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        store_id: 1,
        warehouse_id: 3,
        item_id: 10,
        quantity_on_hand: '100.0000'
      })
    );
  });

  test('creates a variant by subtracting quantity from its parent item pool', async () => {
    inventoryModel.findItemById.mockResolvedValue({
      id: 10,
      store_id: 1,
      tracking_type: 'stocked',
      base_unit_type: 'quantity',
      base_unit_conversion_to_base: 1
    });
    inventoryModel.getItemStockBalanceForUpdate.mockResolvedValue({
      id: 44,
      quantity_on_hand: '100.0000'
    });
    inventoryModel.createVariant.mockResolvedValue({
      id: 20,
      store_id: 1,
      item_id: 10,
      variant_name: 'Small bag'
    });
    inventoryModel.updateItemStockBalance.mockResolvedValue(undefined);
    stockService.increaseStock.mockResolvedValue({ stock_balance_id: 55 });

    const variant = await service.createVariant({
      item_id: 10,
      warehouse_id: 3,
      initial_quantity: 25,
      variant_name: 'Small bag',
      sku: 'SMALL-BAG',
      cost: 2,
      status: 'active'
    }, 5, { store_id: 1 });

    expect(variant.id).toBe(20);
    expect(inventoryModel.updateItemStockBalance).toHaveBeenCalledWith(expect.anything(), 44, {
      quantity_on_hand: '75.0000'
    });
    expect(stockService.increaseStock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      storeId: 1,
      warehouseId: 3,
      itemVariantId: 20,
      quantity: 25,
      movementType: 'adjustment',
      referenceType: 'item_variant_allocation'
    }));
  });

  test('rejects variant quantity above its parent item pool', async () => {
    inventoryModel.findItemById.mockResolvedValue({
      id: 10,
      store_id: 1,
      tracking_type: 'stocked',
      base_unit_type: 'quantity',
      base_unit_conversion_to_base: 1
    });
    inventoryModel.getItemStockBalanceForUpdate.mockResolvedValue({
      id: 44,
      quantity_on_hand: '10.0000'
    });

    await expect(service.createVariant({
      item_id: 10,
      warehouse_id: 3,
      initial_quantity: 25,
      variant_name: 'Small bag',
      sku: 'SMALL-BAG',
      status: 'active'
    }, 5, { store_id: 1 })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Insufficient item quantity available'
    });

    expect(inventoryModel.createVariant).not.toHaveBeenCalled();
    expect(stockService.increaseStock).not.toHaveBeenCalled();
  });
});
