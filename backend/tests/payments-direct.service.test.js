jest.mock('../src/modules/payments/payments.model', () => ({
  createCustomerCredit: jest.fn(),
  createPayment: jest.fn(),
  createPaymentAllocation: jest.fn(),
  createReceipt: jest.fn(),
  findOpenDebtsForCustomer: jest.fn(),
  updateDebt: jest.fn()
}));

jest.mock('../src/modules/customers/customers.model', () => ({
  findCustomerById: jest.fn()
}));

jest.mock('../src/modules/accounting/accounting.model', () => ({
  createFinancialTransaction: jest.fn(),
  findCashAccountById: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({
  findSalesmanById: jest.fn()
}));

const mockConnection = { execute: jest.fn() };
jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn((callback) => callback(mockConnection))
}));

const paymentsModel = require('../src/modules/payments/payments.model');
const customerModel = require('../src/modules/customers/customers.model');
const accountingModel = require('../src/modules/accounting/accounting.model');
const service = require('../src/modules/payments/payments.service');

describe('direct customer payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.execute.mockResolvedValue([[]]);
    customerModel.findCustomerById.mockResolvedValue({ id: 3, store_id: 1, status: 'active' });
    accountingModel.findCashAccountById.mockResolvedValue({ id: 2, store_id: 1, status: 'active', cash_flow_permission: 'incoming' });
    paymentsModel.createPayment.mockResolvedValue(31);
    paymentsModel.createReceipt.mockResolvedValue(32);
  });

  test('earns a target credit and dates the ledger transaction when FIFO closes a debt', async () => {
    paymentsModel.findOpenDebtsForCustomer.mockResolvedValue([{
      id: 8,
      store_id: 1,
      customer_id: 3,
      dispatch_customer_id: 4,
      remaining_amount: '10.0000',
      paid_amount: '0.0000'
    }]);

    await service.createCustomerPayment({
      customer_id: 3,
      payment_date: '2026-08-04',
      amount: '10.0000',
      cash_account_id: 2,
      payment_method: 'bank_transfer'
    }, 9, { id: 9, store_id: 1 });

    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE delivery_target_credits'),
      ['2026-08-04', 1, 4]
    );
    expect(accountingModel.createFinancialTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ transaction_date: '2026-08-04', direction: 'in', amount: '10.0000' })
    );
  });
});
