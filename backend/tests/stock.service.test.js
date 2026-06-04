const mockConnection = {
  execute: jest.fn()
};

jest.mock('../src/modules/inventory/inventory.model', () => ({
  createStockBalance: jest.fn(),
  createStockMovement: jest.fn(),
  getStockBalanceForUpdate: jest.fn(),
  updateStockBalance: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback(mockConnection))
}));

jest.mock('../src/middleware/audit.middleware', () => ({
  writeAuditLog: jest.fn()
}));

const inventoryModel = require('../src/modules/inventory/inventory.model');
const { writeAuditLog } = require('../src/middleware/audit.middleware');
const stockService = require('../src/modules/inventory/stock.service');

describe('stock service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adjustStock increases balance, updates average cost, and writes movement/audit records', async () => {
    inventoryModel.getStockBalanceForUpdate.mockResolvedValue({
      id: 10,
      warehouse_id: 1,
      item_variant_id: 2,
      quantity_on_hand: '10.0000',
      quantity_reserved: '0.0000',
      average_cost: '2.0000'
    });
    inventoryModel.createStockMovement.mockResolvedValue(99);

    const result = await stockService.adjustStock({
      warehouseId: 1,
      itemVariantId: 2,
      quantityChange: 5,
      unitCost: 10,
      reason: 'Opening balance',
      createdBy: 7,
      audit: {
        ipAddress: '127.0.0.1',
        userAgent: 'jest'
      }
    });

    expect(inventoryModel.updateStockBalance).toHaveBeenCalledWith(
      mockConnection,
      10,
      {
        quantity_on_hand: '15.0000',
        average_cost: '4.6667'
      }
    );
    expect(inventoryModel.createStockMovement).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({
        warehouse_id: 1,
        item_variant_id: 2,
        movement_type: 'adjustment',
        quantity_change: '5.0000',
        quantity_before: '10.0000',
        quantity_after: '15.0000',
        reference_type: 'stock_adjustment',
        created_by: 7
      })
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({
        userId: 7,
        module: 'inventory',
        action: 'stock_adjustment',
        recordId: 10
      })
    );
    expect(result).toMatchObject({
      stock_balance_id: 10,
      stock_movement_id: 99,
      quantity_after: '15.0000'
    });
  });

  test('adjustStock rejects decreases that exceed available quantity', async () => {
    inventoryModel.getStockBalanceForUpdate.mockResolvedValue({
      id: 10,
      warehouse_id: 1,
      item_variant_id: 2,
      quantity_on_hand: '2.0000',
      quantity_reserved: '0.0000',
      average_cost: '2.0000'
    });

    await expect(
      stockService.adjustStock({
        warehouseId: 1,
        itemVariantId: 2,
        quantityChange: -3,
        reason: 'Correction',
        createdBy: 7
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Insufficient stock available'
    });

    expect(inventoryModel.updateStockBalance).not.toHaveBeenCalled();
    expect(inventoryModel.createStockMovement).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  test('reserveStock moves available stock into reserved quantity', async () => {
    inventoryModel.getStockBalanceForUpdate.mockResolvedValue({
      id: 10,
      warehouse_id: 1,
      item_variant_id: 2,
      quantity_on_hand: '10.0000',
      quantity_reserved: '3.0000',
      average_cost: '2.0000'
    });

    const result = await stockService.reserveStock(mockConnection, {
      warehouseId: 1,
      itemVariantId: 2,
      quantity: 4,
      storeId: 1
    });

    expect(inventoryModel.updateStockBalance).toHaveBeenCalledWith(
      mockConnection,
      10,
      { quantity_reserved: '7.0000' }
    );
    expect(result).toMatchObject({
      stock_balance_id: 10,
      quantity_reserved_before: '3.0000',
      quantity_reserved_after: '7.0000',
      quantity_available_after: '3.0000'
    });
  });

  test('releaseReservedStock rejects releases larger than the reserved quantity', async () => {
    inventoryModel.getStockBalanceForUpdate.mockResolvedValue({
      id: 10,
      warehouse_id: 1,
      item_variant_id: 2,
      quantity_on_hand: '10.0000',
      quantity_reserved: '2.0000',
      average_cost: '2.0000'
    });

    await expect(
      stockService.releaseReservedStock(mockConnection, {
        warehouseId: 1,
        itemVariantId: 2,
        quantity: 3,
        storeId: 1
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Reserved stock cannot be released below zero'
    });

    expect(inventoryModel.updateStockBalance).not.toHaveBeenCalled();
  });
});
