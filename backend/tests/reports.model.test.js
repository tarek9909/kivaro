jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/reports/reports.model');

describe('reports model queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sales report defaults to physically dispatched sale lines', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await model.sales({}, { store_id: 1 });

    expect(db.query.mock.calls[0][0]).toContain("dr.status IN ('dispatched', 'partially_settled', 'completed')");
    expect(db.query.mock.calls[0][0]).toContain('di.line_type = ?');
    expect(db.query.mock.calls[0][1]).toEqual([1, 'sale']);
  });

  test('sales report honors an explicit status filter', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await model.sales({ status: 'pending' }, { store_id: 1 });

    expect(db.query.mock.calls[0][0]).toContain('dr.status = ?');
    expect(db.query.mock.calls[0][1]).toEqual(['pending', 1, 'sale']);
  });

  test('profit-loss recognizes dispatched revenue/COGS and avoids supplier-payment double counting', async () => {
    db.query.mockResolvedValueOnce([]);

    await model.profitLoss({}, { store_id: 1 });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain("status = 'dispatched' THEN total_cost");
    expect(sql).toContain("di.line_type = 'free_gift'");
    expect(sql).toContain('supplier_payments_cash_outflow');
    expect(sql).toContain('sales_cogs + sales.gift_cogs + expenses.operating_expenses');
    expect(sql).not.toContain('supplier_payments_cash_outflow) AS total_expense');
    expect(params).toEqual([1, 1, 1, 1, 1]);
  });
});
