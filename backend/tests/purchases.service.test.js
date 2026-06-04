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

jest.mock('../src/modules/inventory/inventory.model', () => ({}));
jest.mock('../src/modules/inventory/stock.service', () => ({}));

jest.mock('../src/modules/purchases/purchases.model', () => ({
  approvePurchaseOrder: jest.fn(),
  createSupplierPaymentRecord: jest.fn(),
  findPurchaseOrderById: jest.fn(),
  getPurchaseOrderItems: jest.fn(),
  getPurchaseOrderReceipts: jest.fn(),
  getPurchaseOrderReceivedValue: jest.fn(),
  incrementPurchaseOrderPaid: jest.fn(),
  lockPurchaseOrder: jest.fn()
}));

const accountingModel = require('../src/modules/accounting/accounting.model');
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
