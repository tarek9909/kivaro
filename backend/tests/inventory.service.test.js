jest.mock('../src/modules/inventory/inventory.model', () => ({
  createItem: jest.fn(),
  createItemStockBalance: jest.fn(),
  createItemStockAdjustment: jest.fn(),
  createVariant: jest.fn(),
  findCategoryById: jest.fn(),
  findItemById: jest.fn(),
  findUnitById: jest.fn(),
  findVariantById: jest.fn(),
  findWarehouseById: jest.fn(),
  getItemStockBalanceForUpdate: jest.fn(),
  getOrCreateItemStockBalanceForUpdate: jest.fn(),
  hardDeleteItemCascade: jest.fn(),
  updateItemStockBalance: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({
  findLocationById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({
  adjustStock: jest.fn(),
  decreaseStock: jest.fn(),
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

  test('converts weight initial quantities to kg for the item pool', async () => {
    inventoryModel.findUnitById.mockResolvedValue({
      id: 4,
      store_id: 1,
      symbol: 'g',
      unit_type: 'weight',
      conversion_to_base: 0.001
    });
    inventoryModel.createItem.mockResolvedValue({
      id: 10,
      store_id: 1,
      name: 'Raw charcoal',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: 0.001
    });
    inventoryModel.createItemStockBalance.mockResolvedValue({
      id: 44,
      quantity_on_hand: '1.5000'
    });

    await service.createItem({
      category_id: 1,
      base_unit_id: 4,
      warehouse_id: 3,
      initial_quantity: 1500,
      name: 'Raw charcoal',
      code: 'RAW-G',
      item_type: 'raw_charcoal',
      tracking_type: 'stocked'
    }, 5, { store_id: 1 });

    expect(inventoryModel.createItemStockBalance).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        item_id: 10,
        quantity_on_hand: '1.5000'
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

describe('inventory service hard deletes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hard-deletes an item through the dependency cascade', async () => {
    inventoryModel.findItemById.mockResolvedValue({
      id: 7,
      store_id: 1,
      name: 'Disposable item'
    });
    inventoryModel.hardDeleteItemCascade.mockResolvedValue({
      itemDeleted: 1,
      variantCount: 2
    });

    await service.hardDeleteItem(7, { store_id: 1 });

    expect(inventoryModel.hardDeleteItemCascade).toHaveBeenCalledWith(7, expect.anything());
  });
});

describe('inventory service stock adjustments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inventoryModel.findWarehouseById.mockResolvedValue({
      id: 3,
      store_id: 1,
      status: 'active'
    });
  });

  test('adjusts item pool quantity directly', async () => {
    inventoryModel.findItemById.mockResolvedValue({
      id: 10,
      store_id: 1,
      tracking_type: 'stocked',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: 1000
    });
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({
      id: 44,
      quantity_on_hand: '1000.0000'
    });

    const result = await service.adjustStock({
      target_type: 'item',
      warehouse_id: 3,
      item_id: 10,
      quantity_change: 0.4,
      reason: 'seed item pool'
    }, 5, null, { store_id: 1 });

    expect(inventoryModel.updateItemStockBalance).toHaveBeenCalledWith(expect.anything(), 44, {
      quantity_on_hand: '1400.0000'
    });
    expect(result.target_type).toBe('item');
  });

  test('increasing variant stock subtracts from item pool', async () => {
    inventoryModel.findVariantById.mockResolvedValue({
      id: 20,
      store_id: 1,
      item_id: 10,
      tracking_type: 'stocked',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: 1000
    });
    inventoryModel.findItemById.mockResolvedValue({
      id: 10,
      store_id: 1,
      tracking_type: 'stocked',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: 1000
    });
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({
      id: 44,
      quantity_on_hand: '1000.0000'
    });
    stockService.increaseStock.mockResolvedValue({ stock_balance_id: 55 });

    await service.adjustStock({
      target_type: 'variant',
      warehouse_id: 3,
      item_variant_id: 20,
      quantity_change: 0.4,
      reason: 'allocate to variant'
    }, 5, null, { store_id: 1 });

    expect(inventoryModel.updateItemStockBalance).toHaveBeenCalledWith(expect.anything(), 44, {
      quantity_on_hand: '600.0000'
    });
    expect(stockService.increaseStock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      itemVariantId: 20,
      quantity: expect.anything(),
      movementType: 'adjustment'
    }));
  });

  test('packaging variant stock adjusts directly without item pool', async () => {
    inventoryModel.findVariantById.mockResolvedValue({
      id: 30,
      store_id: 1,
      item_id: 12,
      item_type: 'packaging',
      tracking_type: 'stocked',
      base_unit_type: 'quantity',
      base_unit_conversion_to_base: 1
    });
    stockService.adjustStock.mockResolvedValue({ stock_balance_id: 77 });

    await service.adjustStock({
      target_type: 'variant',
      warehouse_id: 3,
      item_variant_id: 30,
      quantity_change: 1000,
      unit_cost: 0.2,
      reason: 'packaging received'
    }, 5, null, { store_id: 1 });

    expect(stockService.adjustStock).toHaveBeenCalledWith(expect.objectContaining({
      itemVariantId: 30,
      quantityChange: 1000,
      unitCost: 0.2
    }));
    expect(inventoryModel.getOrCreateItemStockBalanceForUpdate).not.toHaveBeenCalled();
  });
});
