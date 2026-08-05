const fs = require('fs');
const path = require('path');

const model = require('../src/modules/payments/payments.model');
const schemas = require('../src/modules/payments/payments.schema');

describe('payments target-schema contract', () => {
  test('fresh baseline carries the payment collector and explicit write-off status', () => {
    const schema = fs.readFileSync(path.resolve(__dirname, '../charcoal_erp_clean.sql'), 'utf8');
    expect(schema).toContain("status ENUM('pending','partially_paid','paid','written_off','cancelled')");
    expect(schema).toContain('collected_by_salesman_id BIGINT UNSIGNED NULL');
    expect(schema).toContain('fk_customer_payments_collector');
  });

  test('payment inserts use the target payment number/cash account columns, not retired direct debt links', async () => {
    const connection = {
      execute: jest.fn().mockResolvedValue([{ insertId: 17 }])
    };

    await model.createPayment(connection, {
      store_id: 1,
      customer_id: 4,
      cash_account_id: 2,
      payment_number: 'PAY-1',
      payment_date: '2026-07-22',
      amount: '12.5000',
      payment_method: 'cash',
      collected_by_salesman_id: 6,
      created_by: 9
    });

    const [sql, params] = connection.execute.mock.calls[0];
    expect(sql).toContain('cash_account_id, payment_number');
    expect(sql).toContain('collected_by_salesman_id, notes, created_by');
    expect(sql).not.toContain('customer_debt_id');
    expect(sql).not.toContain('dispatch_request_id');
    expect(params).toEqual([1, 4, 2, 'PAY-1', '2026-07-22', '12.5000', 'cash', null, 6, null, 9]);
  });

  test('credit and debt-adjustment inserts use balance records and target audit fields', async () => {
    const connection = {
      execute: jest.fn().mockResolvedValue([{ insertId: 21 }])
    };

    await model.createCustomerCredit(connection, {
      store_id: 1,
      customer_id: 4,
      credit_number: 'CRD-1',
      credit_date: '2026-07-22',
      original_amount: '3.0000',
      remaining_amount: '3.0000',
      reference_type: 'customer_payment',
      reference_id: 17,
      created_by: 9
    });
    await model.createDebtAdjustment(connection, {
      store_id: 1,
      customer_debt_id: 7,
      dispatch_request_id: 8,
      adjustment_date: '2026-07-22',
      adjustment_type: 'write_off',
      amount: '2.0000',
      reason: 'Approved write-off',
      created_by: 9
    });

    const [creditSql] = connection.execute.mock.calls[0];
    const [adjustmentSql] = connection.execute.mock.calls[1];
    expect(creditSql).toContain('credit_number, credit_date, original_amount, used_amount');
    expect(creditSql).not.toContain('direction');
    expect(adjustmentSql).toContain('dispatch_request_id, adjustment_date');
    expect(adjustmentSql).toContain('reason, created_by');
    expect(adjustmentSql).not.toContain('salesman_id');
  });

  test('credit list accepts status and strips the retired direction filter', () => {
    expect(schemas.listSchema.parse({ query: { status: 'available' } }).query.status).toBe('available');
    expect(schemas.listSchema.parse({ query: { direction: 'credit' } }).query.direction).toBeUndefined();
  });

  test('payments listing accepts the CSV export format and printable PDFs', () => {
    expect(schemas.listSchema.parse({ query: { format: 'csv' } }).query.format).toBe('csv');
    expect(schemas.printSchema.parse({ params: { id: 4 }, query: { format: 'pdf' } }).query.format).toBe('pdf');
  });

  test('direct customer payments require the customer, amount, date, and incoming account', () => {
    const parsed = schemas.paymentSchema.parse({
      body: { customer_id: 4, payment_date: '2026-08-04', amount: 12.5, cash_account_id: 2 }
    });
    expect(parsed.body.customer_id).toBe(4);
    expect(parsed.body.cash_account_id).toBe(2);
  });

  test('debt payments retain the entered date, method, and reference', () => {
    const parsed = schemas.debtPaymentSchema.parse({
      params: { id: 4 },
      body: {
        amount: 12.5,
        cash_account_id: 2,
        payment_date: '2026-08-04',
        payment_method: 'bank_transfer',
        reference_number: 'TXN-44'
      }
    });
    expect(parsed.body).toMatchObject({
      payment_date: '2026-08-04',
      payment_method: 'bank_transfer',
      reference_number: 'TXN-44'
    });
  });
});
