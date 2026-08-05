jest.mock('../src/bootstrap/db', () => ({ query: jest.fn() }));

const model = require('../src/modules/dispatch/dispatch.model');
const { query } = require('../src/bootstrap/db');

describe('dispatch target credits', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('returns the insert ID when a transaction connection is used', async () => {
    const connection = {
      execute: jest.fn().mockResolvedValue([{ insertId: 42 }, []])
    };

    await expect(model.createTargetCreditRecord({
      store_id: 1,
      dispatch_request_id: 8,
      dispatch_customer_id: 3,
      salesman_id: 2,
      customer_id: 4,
      eligible_amount: '12.0000'
    }, connection)).resolves.toBe(42);

    expect(connection.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO delivery_target_credits'),
      expect.arrayContaining([1, 8, 3, 2, 4, '12.0000'])
    );
  });

  test('filters the request list by the selected workflow tab on the server', async () => {
    query
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([]);

    await model.listDispatchRequests({ workflow_tab: 'deliveries', page: 1, limit: 20 });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('dr.status IN (?, ?, ?)'),
      ['approved', 'delivery', 'partially_settled']
    );
  });
});
