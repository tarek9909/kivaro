jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/inventory/inventory.model');

describe('inventory model stock balances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('includes packaging batch quantities in stock balances', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          row_key: 'packaging-8',
          source_type: 'packaging_batch',
          packaging_assignment_id: 8,
          item_name: 'cartoon 10kg',
          variant_name: '10kg',
          sku: 'PA-8',
          unit_symbol: 'pc',
          quantity_on_hand: '50.0000',
          quantity_reserved: '10.0000',
          quantity_available: '40.0000'
        }
      ]);

    const result = await model.listStockBalances({
      filters: { warehouse_id: 2, search: 'PA-8' },
      pagination: { limit: 25, offset: 0 }
    });

    expect(result.rows[0]).toEqual(expect.objectContaining({
      source_type: 'packaging_batch',
      quantity_on_hand: '50.0000',
      quantity_available: '40.0000'
    }));
    expect(db.query.mock.calls[0][0]).toContain('packaging_group_assignments');
    expect(db.query.mock.calls[0][0]).toContain("pga.status IN ('batched', 'consumed')");
    expect(result.total).toBe(1);
  });
});
