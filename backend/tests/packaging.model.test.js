jest.mock('../src/bootstrap/db', () => ({ query: jest.fn() }));

const model = require('../src/modules/packaging/packaging.model');

describe('packaging shelf-stock movement queries', () => {
  test('includes the required store identifier when writing a shelf-stock movement', async () => {
    const connection = { execute: jest.fn().mockResolvedValue([{ insertId: 21 }]) };

    await model.createReadyShelfStockMovement(connection, {
      store_id: 1,
      warehouse_id: 2,
      ready_shelf_stock_id: 2,
      movement_type: 'production',
      quantity_change: 5,
      quantity_before: 0,
      quantity_after: 5,
      state_before: 'reusable',
      state_after: 'reusable',
      reference_type: 'packaging_operation',
      reference_id: 3,
      notes: null,
      created_by: 4
    });

    const [sql, params] = connection.execute.mock.calls[0];
    expect(sql).toContain('store_id');
    expect(params).toHaveLength(13);
    expect(params[0]).toBe(1);
    expect(params[1]).toBe(2);
  });
});
