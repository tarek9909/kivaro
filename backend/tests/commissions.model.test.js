jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/commissions/commissions.model');

describe('commission payroll model queries', () => {
  test('binds payroll month parameters to the matching SQL filters', async () => {
    db.query.mockResolvedValueOnce([]);

    await model.listMonthlyPayroll({
      store_id: 9,
      period_month: '2026-08-01',
      next_period_month: '2026-09-01'
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('period_end >= ? AND period_end < ?');
    expect(sql).toContain('WHERE store_id = ? AND period_month = ?');
    expect(params).toEqual([
      '2026-09-01',
      '2026-08-01',
      '2026-08-01',
      9,
      '2026-08-01',
      '2026-09-01',
      9,
      '2026-08-01',
      9
    ]);
  });
});
