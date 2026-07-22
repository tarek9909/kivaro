jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/packaging/packaging.model');

describe('packaging model ready-stock listing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists canonical ready containers and their immutable packaging operation context', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{
        id: 11,
        packaging_operation_id: 9,
        packaging_group_id: 4,
        initial_inner_quantity: '15.0000',
        remaining_inner_quantity: '12.0000',
        status: 'partial',
        packaging_group_name: 'Six kilogram retail carton'
      }]);

    const result = await model.listReadyStockContainers({
      store_id: 1,
      warehouse_id: 2,
      status: 'partial'
    });

    expect(result.rows).toEqual([
      expect.objectContaining({
        packaging_operation_id: 9,
        initial_inner_quantity: '15.0000',
        remaining_inner_quantity: '12.0000',
        status: 'partial'
      })
    ]);
    expect(db.query.mock.calls[0][0]).toContain('ready_stock_containers');
    expect(db.query.mock.calls[1][0]).toContain('packaging_operations');
    expect(db.query.mock.calls[1][0]).toContain('remaining_ratio');
    expect(result.meta.total).toBe(1);
  });
});
