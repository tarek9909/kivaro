jest.mock('../src/bootstrap/db', () => ({ query: jest.fn() }));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/inventory/inventory.model');

describe('canonical inventory model queries', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lists item balances from the canonical item ledger with shelf and carton state', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{
        stock_balance_id: 8,
        item_id: 3,
        item_kind: 'normal',
        stock_mode: 'carton_weight',
        quantity_on_hand: '12.0000',
        quantity_reserved: '0.0000',
        quantity_available: '12.0000',
        sealed_cartons: 1,
        open_loose_units: 15,
        stock_health: 'healthy'
      }]);

    const result = await model.listStockBalances({
      filters: { warehouse_id: 2, item_kind: 'normal' },
      pagination: { limit: 25, offset: 0 }
    });

    expect(result.rows[0]).toEqual(expect.objectContaining({
      stock_balance_id: 8,
      sealed_cartons: 1,
      open_loose_units: 15
    }));
    expect(db.query.mock.calls[0][0]).toContain('item_stock_balances b');
    expect(db.query.mock.calls[0][0]).toContain('carton_stock_lots');
    expect(db.query.mock.calls[0][0]).toContain('open_carton_shelves');
  });

  test('lists item movements directly from the canonical ledger', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{ movement_id: 9, item_id: 3, movement_type: 'carton_open' }]);

    const result = await model.listStockMovements({
      filters: { item_id: 3, movement_type: 'carton_open' },
      pagination: { limit: 25, offset: 0 }
    });

    expect(result.rows).toHaveLength(1);
    expect(db.query.mock.calls[0][0]).toContain('item_stock_movements sm');
  });
});
