const mockConnection = { execute: jest.fn() };

jest.mock('../src/modules/inventory/inventory.model', () => ({
  createCartonStockLot: jest.fn(),
  createItemStockMovement: jest.fn(),
  createOpenCartonShelf: jest.fn(),
  findItemById: jest.fn(),
  getActiveOpenCartonShelfForUpdate: jest.fn(),
  getAvailableCartonLotsForUpdate: jest.fn(),
  getCartonLotForUpdate: jest.fn(),
  getOpenCartonShelfForUpdate: jest.fn(),
  getOrCreateItemStockBalanceForUpdate: jest.fn(),
  updateCartonStockLot: jest.fn(),
  updateItemStockBalance: jest.fn(),
  updateOpenCartonShelf: jest.fn()
}));

const inventoryModel = require('../src/modules/inventory/inventory.model');
const stockService = require('../src/modules/inventory/stock.service');

const weightItem = {
  id: 2,
  store_id: 1,
  item_kind: 'normal',
  stock_mode: 'weight',
  status: 'active',
  default_cost: '2.0000'
};

const cartonItem = {
  id: 3,
  store_id: 1,
  item_kind: 'normal',
  stock_mode: 'carton_weight',
  kg_per_carton: '6.0000',
  loose_units_per_carton: 15,
  status: 'active',
  default_cost: '2.0000'
};

const balance = {
  id: 10,
  warehouse_id: 1,
  item_id: 3,
  quantity_on_hand: '10.0000',
  quantity_reserved: '0.0000',
  average_cost: '2.0000'
};

describe('canonical item stock service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inventoryModel.createItemStockMovement.mockResolvedValue(99);
  });

  test('updates item-level weighted average cost for a positive weight receipt', async () => {
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({
      ...balance,
      item_id: weightItem.id
    });

    const result = await stockService.increaseItemStock(mockConnection, {
      storeId: 1,
      warehouseId: 1,
      itemId: weightItem.id,
      item: weightItem,
      quantity: 5,
      unitCost: 10,
      movementType: 'purchase_receive'
    });

    expect(inventoryModel.updateItemStockBalance).toHaveBeenCalledWith(mockConnection, 10, {
      quantity_on_hand: '15.0000',
      average_cost: '4.6667'
    });
    expect(inventoryModel.createItemStockMovement).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      item_id: weightItem.id,
      movement_type: 'purchase_receive',
      quantity_change: '5.0000',
      total_cost: '50.0000'
    }));
    expect(result.quantity_after).toBe('15.0000');
  });

  test('receives carton-weight stock as kg, creates a FIFO lot, and derives per-kg WAC', async () => {
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({
      ...balance,
      quantity_on_hand: '0.0000',
      average_cost: '0.0000'
    });
    inventoryModel.createCartonStockLot.mockResolvedValue(42);

    const result = await stockService.receiveCartonStock(mockConnection, {
      storeId: 1,
      warehouseId: 1,
      itemId: cartonItem.id,
      item: cartonItem,
      cartonCount: 2,
      costPerCarton: 12,
      movementType: 'purchase_receive'
    });

    expect(inventoryModel.createCartonStockLot).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      item_id: cartonItem.id,
      received_cartons: 2,
      remaining_cartons: 2,
      kg_per_carton: '6.0000',
      loose_units_per_carton: 15,
      unit_cost_per_kg: '2.0000'
    }));
    expect(inventoryModel.updateItemStockBalance).toHaveBeenCalledWith(mockConnection, 10, {
      quantity_on_hand: '12.0000',
      average_cost: '2.0000'
    });
    expect(result.carton_lot_id).toBe(42);
    expect(result.quantity_after).toBe('12.0000');
  });

  test('uses the existing open shelf before opening another carton', async () => {
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({ ...balance });
    inventoryModel.getActiveOpenCartonShelfForUpdate.mockResolvedValue({
      id: 11,
      warehouse_id: 1,
      item_id: cartonItem.id,
      carton_lot_id: 41,
      remaining_loose_units: 5,
      status: 'open'
    });

    const result = await stockService.consumeCartonLooseUnits(mockConnection, {
      storeId: 1,
      warehouseId: 1,
      itemId: cartonItem.id,
      item: cartonItem,
      looseUnits: 3,
      movementType: 'packaging_consume'
    });

    expect(inventoryModel.getAvailableCartonLotsForUpdate).not.toHaveBeenCalled();
    expect(inventoryModel.updateOpenCartonShelf).toHaveBeenCalledWith(mockConnection, 11, {
      remaining_loose_units: 2
    });
    expect(inventoryModel.updateItemStockBalance).toHaveBeenCalledWith(mockConnection, 10, {
      quantity_on_hand: '8.8000',
      quantity_reserved: '0.0000'
    });
    expect(result.carton_allocations).toEqual([expect.objectContaining({
      open_carton_shelf_id: 11,
      loose_units: 3,
      quantity_kg: '1.2000'
    })]);
  });

  test('opens the oldest sealed carton when no shelf stock remains', async () => {
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({ ...balance });
    inventoryModel.getActiveOpenCartonShelfForUpdate.mockResolvedValue(null);
    inventoryModel.getAvailableCartonLotsForUpdate.mockResolvedValue([{ id: 41 }]);
    inventoryModel.getCartonLotForUpdate.mockResolvedValue({
      id: 41,
      warehouse_id: 1,
      item_id: cartonItem.id,
      remaining_cartons: 2,
      loose_units_per_carton: 15
    });
    inventoryModel.createOpenCartonShelf.mockResolvedValue(12);

    await stockService.consumeCartonLooseUnits(mockConnection, {
      storeId: 1,
      warehouseId: 1,
      itemId: cartonItem.id,
      item: cartonItem,
      looseUnits: 15,
      movementType: 'packaging_consume'
    });

    expect(inventoryModel.updateCartonStockLot).toHaveBeenCalledWith(mockConnection, 41, {
      remaining_cartons: 1
    });
    expect(inventoryModel.createOpenCartonShelf).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      carton_lot_id: 41,
      initial_loose_units: 15
    }));
    expect(inventoryModel.updateOpenCartonShelf).toHaveBeenCalledWith(mockConnection, 12, {
      remaining_loose_units: 0,
      status: 'closed',
      closed_at: 'CURRENT_TIMESTAMP'
    });
    expect(inventoryModel.createItemStockMovement).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      movement_type: 'carton_open',
      carton_stock_lot_id: 41,
      open_carton_shelf_id: 12
    }));
  });

  test('does not consume loose shelf units reserved by an approved dispatch', async () => {
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({ ...balance });
    inventoryModel.getActiveOpenCartonShelfForUpdate.mockResolvedValue({
      id: 11,
      warehouse_id: 1,
      item_id: cartonItem.id,
      carton_lot_id: 41,
      remaining_loose_units: 5,
      available_loose_units: 0,
      status: 'open'
    });

    await expect(stockService.consumeCartonLooseUnits(mockConnection, {
      storeId: 1,
      warehouseId: 1,
      itemId: cartonItem.id,
      item: cartonItem,
      looseUnits: 1,
      movementType: 'packaging_consume'
    })).rejects.toMatchObject({
      statusCode: 409,
      message: 'The active open carton is fully reserved for dispatch'
    });
    expect(inventoryModel.updateItemStockBalance).not.toHaveBeenCalled();
  });

  test('creates low-stock notifications only when available stock crosses the reorder level', async () => {
    const lowStockItem = {
      ...weightItem,
      name: 'Fine charcoal',
      reorder_level: '5.0000'
    };
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({
      ...balance,
      item_id: lowStockItem.id,
      quantity_on_hand: '10.0000',
      quantity_reserved: '0.0000'
    });
    mockConnection.execute.mockResolvedValueOnce([[{ id: 73 }]]);

    await stockService.reserveItemStock(mockConnection, {
      storeId: 1,
      warehouseId: 1,
      itemId: lowStockItem.id,
      item: lowStockItem,
      quantity: 6,
      movementType: 'dispatch_reserve'
    });

    expect(mockConnection.execute.mock.calls[0][0]).toContain('FROM users u');
    expect(mockConnection.execute.mock.calls[1][0]).toContain('INSERT INTO notifications');
    expect(mockConnection.execute.mock.calls[1][1]).toEqual(expect.arrayContaining([
      1,
      73,
      expect.stringContaining('Low stock: Fine charcoal'),
      expect.any(String),
      10
    ]));
  });

  test('consumes only the explicitly allocated sealed carton lots', async () => {
    inventoryModel.getOrCreateItemStockBalanceForUpdate.mockResolvedValue({
      ...balance,
      quantity_on_hand: '18.0000'
    });
    inventoryModel.getCartonLotForUpdate.mockResolvedValue({
      id: 50,
      warehouse_id: 1,
      item_id: cartonItem.id,
      remaining_cartons: 2
    });

    await stockService.consumeSealedCartons(mockConnection, {
      storeId: 1,
      warehouseId: 1,
      itemId: cartonItem.id,
      item: cartonItem,
      cartonCount: 1,
      sourceAllocations: [{ carton_lot_id: 50, carton_count: 1 }],
      movementType: 'dispatch_out',
      consumeReserved: false
    });

    expect(inventoryModel.getAvailableCartonLotsForUpdate).not.toHaveBeenCalled();
    expect(inventoryModel.updateCartonStockLot).toHaveBeenCalledWith(mockConnection, 50, {
      remaining_cartons: 1
    });
  });
});
