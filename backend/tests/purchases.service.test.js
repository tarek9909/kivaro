const mockConnection = {
  execute: jest.fn()
};

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback(mockConnection))
}));

jest.mock('../src/middleware/audit.middleware', () => ({
  writeAuditLog: jest.fn()
}));

jest.mock('../src/modules/accounting/accounting.model', () => ({
  createFinancialTransaction: jest.fn(),
  findCashAccountById: jest.fn()
}));

jest.mock('../src/modules/inventory/inventory.model', () => ({
  findItemById: jest.fn()
}));
jest.mock('../src/modules/inventory/stock.service', () => ({
  increaseItemStock: jest.fn(),
  receiveCartonStock: jest.fn()
}));

jest.mock('../src/modules/purchases/purchases.model', () => ({
  approvePurchaseOrder: jest.fn(),
  createSupplierPaymentRecord: jest.fn(),
  findPurchaseOrderById: jest.fn(),
  getPurchaseOrderItems: jest.fn(),
  getPurchaseOrderReceipts: jest.fn(),
  getPurchaseOrderReceivedValue: jest.fn(),
  getReceiptById: jest.fn(),
  incrementPurchaseOrderPaid: jest.fn(),
  incrementReceivedQuantity: jest.fn(),
  createReceipt: jest.fn(),
  createReceiptItem: jest.fn(),
  lockPurchaseOrder: jest.fn(),
  lockPurchaseOrderItems: jest.fn(),
  setPurchaseOrderStatus: jest.fn()
}));

const accountingModel = require('../src/modules/accounting/accounting.model');
const inventoryModel = require('../src/modules/inventory/inventory.model');
const stockService = require('../src/modules/inventory/stock.service');
const purchaseModel = require('../src/modules/purchases/purchases.model');
const service = require('../src/modules/purchases/purchases.service');

describe('purchases service approval payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    purchaseModel.getPurchaseOrderItems.mockResolvedValue([]);
    purchaseModel.getPurchaseOrderReceipts.mockResolvedValue([]);
    purchaseModel.getPurchaseOrderReceivedValue.mockResolvedValue(0);
  });

  test('approving a purchase order records the supplier payment and cash transaction', async () => {
    const actor = { id: 7, store_id: 1 };
    const purchaseOrder = {
      id: 10,
      store_id: 1,
      po_number: 'PO-10',
      supplier_id: 5,
      warehouse_id: 3,
      cash_account_id: 2,
      payment_method: 'bank_transfer',
      status: 'pending',
      total_amount: '125.50',
      amount_paid: '25.50',
      approved_at: null
    };

    purchaseModel.findPurchaseOrderById
      .mockResolvedValueOnce(purchaseOrder)
      .mockResolvedValueOnce({ ...purchaseOrder, status: 'approved', amount_paid: '125.00' });
    purchaseModel.lockPurchaseOrder.mockResolvedValue(purchaseOrder);
    purchaseModel.createSupplierPaymentRecord.mockResolvedValue(44);
    accountingModel.findCashAccountById.mockResolvedValue({
      id: 2,
      store_id: 1,
      status: 'active'
    });

    await service.approvePurchaseOrder(10, actor.id, actor);

    expect(purchaseModel.approvePurchaseOrder).toHaveBeenCalledWith(mockConnection, 10, actor.id);
    expect(purchaseModel.createSupplierPaymentRecord).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({
        store_id: 1,
        supplier_id: 5,
        purchase_order_id: 10,
        amount: '100.0000',
        payment_method: 'bank_transfer',
        reference_number: 'PO-10',
        cash_account_id: 2,
        created_by: actor.id
      })
    );
    expect(purchaseModel.incrementPurchaseOrderPaid).toHaveBeenCalledWith(mockConnection, 10, '100.0000');
    expect(accountingModel.createFinancialTransaction).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({
        store_id: 1,
        cash_account_id: 2,
        transaction_type: 'supplier_payment',
        direction: 'out',
        amount: '100.0000',
        reference_type: 'supplier_payment',
        reference_id: 44,
        created_by: actor.id
      })
    );
  });
});

describe('canonical purchase receiving', () => {
  const actor = { id: 7, store_id: 1 };
  const purchaseOrder = {
    id: 10,
    store_id: 1,
    warehouse_id: 3,
    status: 'approved',
    amount_paid: '0.0000',
    total_amount: '100.0000'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    purchaseModel.findPurchaseOrderById.mockResolvedValue(purchaseOrder);
    purchaseModel.getPurchaseOrderItems.mockResolvedValue([]);
    purchaseModel.getPurchaseOrderReceipts.mockResolvedValue([]);
    purchaseModel.getPurchaseOrderReceivedValue.mockResolvedValue(0);
    purchaseModel.lockPurchaseOrder.mockResolvedValue(purchaseOrder);
    purchaseModel.createReceipt.mockResolvedValue(90);
    purchaseModel.getReceiptById.mockResolvedValue({ id: 90, purchase_order_id: 10 });
  });

  test('receives carton-weight lines as carton count/cost, creates a lot-backed inventory receipt, and stores canonical item ids only', async () => {
    const cartonItem = {
      id: 100,
      store_id: 1,
      item_kind: 'normal',
      stock_mode: 'carton_weight',
      kg_per_carton: '6.0000',
      loose_units_per_carton: 15,
      status: 'active',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: '1.00000000'
    };
    inventoryModel.findItemById.mockResolvedValue(cartonItem);
    purchaseModel.lockPurchaseOrderItems.mockResolvedValue([{
      id: 51,
      item_id: cartonItem.id,
      ordered_quantity: '5.0000',
      received_quantity: '0.0000',
      unit_cost: '12.0000'
    }]);

    await service.receivePurchaseOrder(10, {
      received_date: '2026-07-22',
      items: [{
        purchase_order_item_id: 51,
        carton_count: 2,
        cost_per_carton: 15
      }]
    }, actor.id, {}, actor);

    expect(purchaseModel.createReceiptItem).toHaveBeenCalledWith(mockConnection, {
      purchase_receipt_id: 90,
      purchase_order_item_id: 51,
      item_id: 100,
      received_quantity: '2.0000',
      unit_cost: '15.0000'
    });
    expect(stockService.receiveCartonStock).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      storeId: 1,
      warehouseId: 3,
      itemId: 100,
      cartonCount: expect.anything(),
      costPerCarton: expect.anything(),
      movementType: 'purchase_receive',
      referenceType: 'purchase_receipt',
      referenceId: 90
    }));
    const stockCall = stockService.receiveCartonStock.mock.calls[0][1];
    expect(stockCall.cartonCount.toString()).toBe('2');
    expect(stockCall.costPerCarton.toString()).toBe('15');
    expect(purchaseModel.setPurchaseOrderStatus).toHaveBeenCalledWith(mockConnection, 10, 'partially_received');
  });

  test('normalizes a weight receipt and its entered unit cost before updating canonical kg WAC stock', async () => {
    const weightItem = {
      id: 101,
      store_id: 1,
      item_kind: 'normal',
      stock_mode: 'weight',
      status: 'active',
      base_unit_type: 'weight',
      base_unit_conversion_to_base: '0.00100000'
    };
    inventoryModel.findItemById.mockResolvedValue(weightItem);
    purchaseModel.lockPurchaseOrderItems.mockResolvedValue([{
      id: 52,
      item_id: weightItem.id,
      ordered_quantity: '1500.0000',
      received_quantity: '0.0000',
      unit_cost: '0.0020'
    }]);

    await service.receivePurchaseOrder(10, {
      received_date: '2026-07-22',
      items: [{
        purchase_order_item_id: 52,
        quantity: 1000,
        unit_cost: 0.003
      }]
    }, actor.id, {}, actor);

    expect(purchaseModel.createReceiptItem).toHaveBeenCalledWith(mockConnection, {
      purchase_receipt_id: 90,
      purchase_order_item_id: 52,
      item_id: 101,
      received_quantity: '1000.0000',
      unit_cost: '0.0030'
    });
    const stockCall = stockService.increaseItemStock.mock.calls[0][1];
    expect(stockCall.quantity.toString()).toBe('1');
    expect(stockCall.unitCost.toString()).toBe('3');
    expect(stockCall.movementType).toBe('purchase_receive');
  });
});
