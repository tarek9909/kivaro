jest.mock('../src/modules/inventory/inventory.model', () => ({
  countItemMovements: jest.fn(),
  createItem: jest.fn(),
  findCategoryById: jest.fn(),
  findItemById: jest.fn(),
  findUnitById: jest.fn(),
  findWarehouseById: jest.fn(),
  hasItemStock: jest.fn(),
  updateItem: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({
  findLocationById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({
  adjustItemStock: jest.fn(),
  increaseItemStock: jest.fn(),
  receiveCartonStock: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback({ execute: jest.fn() }))
}));

jest.mock('../src/middleware/audit.middleware', () => ({
  writeAuditLog: jest.fn()
}));

const inventoryModel = require('../src/modules/inventory/inventory.model');
const stockService = require('../src/modules/inventory/stock.service');
const service = require('../src/modules/inventory/inventory.service');

const actor = { store_id: 1 };

describe('canonical item configuration service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inventoryModel.findCategoryById.mockResolvedValue({ id: 1, store_id: 1 });
    inventoryModel.findWarehouseById.mockResolvedValue({ id: 3, store_id: 1, status: 'active' });
  });

  test('requires packaging materials to use a pc quantity unit', async () => {
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
      item_kind: 'packaging',
      stock_mode: 'piece'
    }, 5, actor)).rejects.toMatchObject({
      statusCode: 400,
      errors: [expect.objectContaining({ field: 'base_unit_id' })]
    });
    expect(inventoryModel.createItem).not.toHaveBeenCalled();
  });

  test('creates carton-weight initial stock through a carton receipt and WAC flow', async () => {
    inventoryModel.findUnitById.mockResolvedValue({
      id: 2,
      store_id: 1,
      symbol: 'kg',
      unit_type: 'weight'
    });
    inventoryModel.createItem.mockResolvedValue({
      id: 10,
      store_id: 1,
      item_kind: 'normal',
      stock_mode: 'carton_weight',
      kg_per_carton: 6,
      loose_units_per_carton: 15,
      status: 'active'
    });

    await service.createItem({
      category_id: 1,
      base_unit_id: 2,
      warehouse_id: 3,
      initial_cartons: 10,
      initial_cost_per_carton: 12,
      name: 'Raw charcoal',
      code: 'RAW-6KG',
      item_kind: 'normal',
      stock_mode: 'carton_weight',
      kg_per_carton: 6,
      loose_units_per_carton: 15,
      default_cost: 2
    }, 5, actor);

    expect(inventoryModel.createItem).toHaveBeenCalledWith(expect.objectContaining({
      item_kind: 'normal',
      stock_mode: 'carton_weight',
      max_content_weight_kg: null,
      created_by: 5
    }), expect.anything());
    expect(stockService.receiveCartonStock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      itemId: 10,
      cartonCount: expect.anything(),
      costPerCarton: 12,
      movementType: 'opening_balance'
    }));
  });

  test('does not allow a carton-weight item to receive initial kg directly', async () => {
    inventoryModel.findUnitById.mockResolvedValue({
      id: 2,
      store_id: 1,
      symbol: 'kg',
      unit_type: 'weight'
    });

    await expect(service.createItem({
      category_id: 1,
      base_unit_id: 2,
      warehouse_id: 3,
      initial_quantity: 6,
      name: 'Raw charcoal',
      code: 'RAW-6KG',
      item_kind: 'normal',
      stock_mode: 'carton_weight',
      kg_per_carton: 6,
      loose_units_per_carton: 15
    }, 5, actor)).rejects.toMatchObject({
      statusCode: 400,
      errors: [expect.objectContaining({ field: 'initial_quantity' })]
    });
  });

  test('normalizes non-carton weight entry units to canonical kg stock', async () => {
    inventoryModel.findUnitById.mockResolvedValue({
      id: 2,
      store_id: 1,
      symbol: 'g',
      unit_type: 'weight',
      conversion_to_base: '0.00100000'
    });
    inventoryModel.createItem.mockResolvedValue({
      id: 11,
      store_id: 1,
      item_kind: 'normal',
      stock_mode: 'weight',
      status: 'active',
      default_cost: 2
    });

    await service.createItem({
      category_id: 1,
      base_unit_id: 2,
      warehouse_id: 3,
      initial_quantity: 1500,
      initial_unit_cost: 2,
      name: 'Fine charcoal',
      code: 'FINE-G',
      item_kind: 'normal',
      stock_mode: 'weight'
    }, 5, actor);

    expect(stockService.increaseItemStock).toHaveBeenCalled();
    const stockInput = stockService.increaseItemStock.mock.calls[0][1];
    expect(stockInput.quantity.toString()).toBe('1.5');
  });

  test('locks carton and unit configuration after stock movement history exists', async () => {
    inventoryModel.findItemById.mockResolvedValue({
      id: 10,
      store_id: 1,
      category_id: 1,
      base_unit_id: 2,
      item_kind: 'normal',
      stock_mode: 'carton_weight',
      kg_per_carton: '6.0000',
      loose_units_per_carton: 15,
      max_content_weight_kg: null
    });
    inventoryModel.findUnitById.mockResolvedValue({
      id: 2,
      store_id: 1,
      symbol: 'kg',
      unit_type: 'weight'
    });
    inventoryModel.countItemMovements.mockResolvedValue(1);

    await expect(service.updateItem(10, { kg_per_carton: 8 }, actor)).rejects.toMatchObject({
      statusCode: 409,
      message: 'Stock configuration cannot change after item stock activity exists'
    });
    expect(inventoryModel.updateItem).not.toHaveBeenCalled();
  });

  test('routes carton receipt input to the carton receipt stock helper', async () => {
    inventoryModel.findItemById.mockResolvedValue({
      id: 10,
      store_id: 1,
      item_kind: 'normal',
      stock_mode: 'carton_weight',
      kg_per_carton: 6,
      loose_units_per_carton: 15,
      status: 'active'
    });
    stockService.receiveCartonStock.mockResolvedValue({ stock_balance_id: 44 });

    await service.receiveStock({
      warehouse_id: 3,
      item_id: 10,
      carton_count: 4,
      cost_per_carton: 14
    }, 5, null, actor);

    expect(stockService.receiveCartonStock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      warehouseId: 3,
      itemId: 10,
      cartonCount: 4,
      costPerCarton: 14,
      movementType: 'purchase_receive'
    }));
  });
});
