jest.mock('../src/modules/payments/payments.model', () => ({
  lockDebtById: jest.fn(),
  lockAvailableCreditsForCustomer: jest.fn(),
  updateCustomerCredit: jest.fn(),
  updateDebt: jest.fn(),
  createReceipt: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn((callback) => callback({}))
}));

const model = require('../src/modules/payments/payments.model');
const service = require('../src/modules/payments/payments.service');

describe('customer credit application', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('consumes available credits FIFO and updates the debt/receipt atomically', async () => {
    model.lockDebtById.mockResolvedValue({
      id: 8,
      store_id: 1,
      customer_id: 3,
      dispatch_request_id: 2,
      dispatch_customer_id: 4,
      subtotal_amount: '10.0000',
      vat_amount: '0.0000',
      original_amount: '10.0000',
      paid_amount: '0.0000',
      remaining_amount: '10.0000',
      status: 'pending'
    });
    model.lockAvailableCreditsForCustomer.mockResolvedValue([
      { id: 1, remaining_amount: '3.0000', used_amount: '0.0000' },
      { id: 2, remaining_amount: '5.0000', used_amount: '1.0000' }
    ]);
    model.createReceipt.mockResolvedValue(31);

    const result = await service.applyCreditToDebt(8, { amount: '6.0000' }, 9, {
      id: 9,
      store_id: 1,
      is_superadmin: false
    });

    expect(result).toEqual({ applied_amount: '6.0000', receipt_id: 31 });
    expect(model.updateCustomerCredit).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({
      used_amount: '3.0000',
      remaining_amount: '0.0000',
      status: 'used'
    }), expect.anything());
    expect(model.updateCustomerCredit).toHaveBeenNthCalledWith(2, 2, expect.objectContaining({
      used_amount: '4.0000',
      remaining_amount: '2.0000',
      status: 'partially_used'
    }), expect.anything());
    expect(model.updateDebt).toHaveBeenCalledWith(8, expect.objectContaining({
      paid_amount: '6.0000',
      remaining_amount: '4.0000',
      status: 'partially_paid'
    }), expect.anything());
    expect(model.createReceipt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      receipt_type: 'credit',
      paid_amount: '6.0000'
    }));
  });
});
