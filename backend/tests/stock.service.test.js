const mockConnection = {
  execute: jest.fn()
};

jest.mock('../src/modules/inventory/inventory.model', () => ({
  createStockBalance: jest.fn(),
  createStockMovement: jest.fn(),
  findVariantById: jest.fn(),
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
    inventoryModel.findVariantById.mockResolvedValue({
      id: 2,
      base_unit_symbol: 'kg',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: '1.000000'
    });
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

  test('adjustStock rejects fractional quantities for piece-based items', async () => {
    inventoryModel.findVariantById.mockResolvedValue({
      id: 2,
      base_unit_symbol: 'pc',
      base_unit_type: 'quantity',
      base_unit_conversion_to_base: '1.000000'
    });

    await expect(
      stockService.adjustStock({
        warehouseId: 1,
        itemVariantId: 2,
        quantityChange: 1.5,
        reason: 'Opening count',
        createdBy: 7
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'quantity',
          message: 'Piece-based stock quantities must be whole numbers'
        })
      ])
    });

    expect(inventoryModel.updateStockBalance).not.toHaveBeenCalled();
    expect(inventoryModel.createStockMovement).not.toHaveBeenCalled();
  });

  test('adjustStock allows fractional quantities for weight-based items', async () => {
    inventoryModel.getStockBalanceForUpdate.mockResolvedValue({
      id: 10,
      warehouse_id: 1,
      item_variant_id: 2,
      quantity_on_hand: '10.0000',
      quantity_reserved: '0.0000',
      average_cost: '2.0000'
    });
    inventoryModel.createStockMovement.mockResolvedValue(99);

    await stockService.adjustStock({
      warehouseId: 1,
      itemVariantId: 2,
      quantityChange: 1.5,
      unitCost: 2,
      reason: 'Weighed intake',
      createdBy: 7
    });

    expect(inventoryModel.updateStockBalance).toHaveBeenCalledWith(
      mockConnection,
      10,
      expect.objectContaining({
        quantity_on_hand: '11.5000'
      })
    );
  });

  test('adjustStock stores ton-based item quantities as kg', async () => {
    inventoryModel.findVariantById.mockResolvedValue({
      id: 2,
      base_unit_symbol: 'ton',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: '1000.000000'
    });
    inventoryModel.getStockBalanceForUpdate.mockResolvedValue({
      id: 10,
      warehouse_id: 1,
      item_variant_id: 2,
      quantity_on_hand: '0.0000',
      quantity_reserved: '0.0000',
      average_cost: '0.0000'
    });
    inventoryModel.createStockMovement.mockResolvedValue(99);

    await stockService.adjustStock({
      warehouseId: 1,
      itemVariantId: 2,
      quantityChange: 1,
      unitCost: 500,
      reason: 'One ton intake',
      createdBy: 7
    });

    expect(inventoryModel.updateStockBalance).toHaveBeenCalledWith(
      mockConnection,
      10,
      {
        quantity_on_hand: '1000.0000',
        average_cost: '0.5000'
      }
    );
    expect(inventoryModel.createStockMovement).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({
        quantity_change: '1000.0000',
        unit_cost: '0.5000'
      })
    );
  });

  test('adjustStock stores gram-based item quantities as kg', async () => {
    inventoryModel.findVariantById.mockResolvedValue({
      id: 2,
      base_unit_symbol: 'g',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: '0.001000'
    });
    inventoryModel.getStockBalanceForUpdate.mockResolvedValue({
      id: 10,
      warehouse_id: 1,
      item_variant_id: 2,
      quantity_on_hand: '0.0000',
      quantity_reserved: '0.0000',
      average_cost: '0.0000'
    });
    inventoryModel.createStockMovement.mockResolvedValue(99);

    await stockService.adjustStock({
      warehouseId: 1,
      itemVariantId: 2,
      quantityChange: 1000,
      unitCost: 0.002,
      reason: 'One kilogram in grams',
      createdBy: 7
    });

    expect(inventoryModel.updateStockBalance).toHaveBeenCalledWith(
      mockConnection,
      10,
      {
        quantity_on_hand: '1.0000',
        average_cost: '2.0000'
      }
    );
    expect(inventoryModel.createStockMovement).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({
        quantity_change: '1.0000',
        unit_cost: '2.0000'
      })
    );
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
