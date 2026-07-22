jest.mock('../src/bootstrap/db', () => ({ query: jest.fn() }));

const model = require('../src/modules/purchases/purchases.model');

describe('supplier payment persistence', () => {
  test('persists the selected cash account on a supplier payment record', async () => {
    const connection = {
      execute: jest.fn().mockResolvedValue([{ insertId: 91 }])
    };

    const paymentId = await model.createSupplierPaymentRecord(connection, {
      store_id: 1,
      supplier_id: 4,
      purchase_order_id: 8,
      payment_date: '2026-07-22',
      amount: '25.0000',
      payment_method: 'cash',
      reference_number: 'PAY-91',
      cash_account_id: 3,
      notes: 'Supplier settlement',
      created_by: 7
    });

    expect(paymentId).toBe(91);
    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining('cash_account_id'),
      [1, 4, 8, '2026-07-22', '25.0000', 'cash', 'PAY-91', 3, 'Supplier settlement', 7]
    );
  });
});
