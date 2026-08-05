jest.mock('../src/bootstrap/db', () => ({ query: jest.fn() }));

const { query } = require('../src/bootstrap/db');
const model = require('../src/modules/payments/payments.model');

describe('customer credit listing', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns all usable credit states in FIFO order for debt application', async () => {
    query
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([
        { id: 4, status: 'available', remaining_amount: '3.0000' },
        { id: 7, status: 'partially_used', remaining_amount: '2.0000' }
      ]);

    const result = await model.listCredits({
      store_id: 1,
      customer_id: 2,
      available_for_application: true,
      page: 1,
      limit: 50
    });

    expect(result.rows.map((credit) => credit.status)).toEqual(['available', 'partially_used']);
    expect(result.meta.total).toBe(2);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("cc.status IN ('available', 'partially_used')"), [2, 1, 50, 0]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining('ORDER BY cc.credit_date ASC, cc.id ASC'), expect.any(Array));
  });
});
