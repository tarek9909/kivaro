jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/reports/reports.model');

describe('reports model queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sales report defaults to completed dispatches', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await model.sales({}, { store_id: 1 });

    expect(db.query.mock.calls[0][0]).toContain('dr.status = ?');
    expect(db.query.mock.calls[0][1]).toEqual(['completed', 1]);
  });

  test('sales report honors an explicit status filter', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await model.sales({ status: 'pending' }, { store_id: 1 });

    expect(db.query.mock.calls[0][0]).toContain('dr.status = ?');
    expect(db.query.mock.calls[0][1]).toEqual(['pending', 1]);
  });

  test('profit-loss subtracts inbound manual expense adjustments', async () => {
    db.query.mockResolvedValueOnce([]);

    await model.profitLoss({}, { store_id: 1 });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain("WHEN transaction_type = 'expense' THEN amount");
    expect(sql).toContain("transaction_type = 'manual_adjustment'");
    expect(sql).toContain("reference_type = 'expense'");
    expect(sql).toContain("direction = 'in' THEN -amount");
    expect(params).toEqual([1, 1, 1]);
  });
});
