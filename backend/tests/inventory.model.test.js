jest.mock('../src/bootstrap/db', () => ({ query: jest.fn() }));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/inventory/inventory.model');

describe('canonical inventory model queries', () => {
  beforeEach(() => jest.clearAllMocks());

  test('creates carton lots with one value for every declared column', async () => {
    const connection = { execute: jest.fn().mockResolvedValue([{ insertId: 12 }]) };

    await model.createCartonStockLot(connection, {
      store_id: 1,
      warehouse_id: 2,
      item_id: 3,
      received_cartons: 4,
      remaining_cartons: 4,
      kg_per_carton: 10,
      unit_cost_per_carton: 20,
      source_type: 'opening_balance',
      source_id: 3,
      received_at: null,
      created_by: 1
    });

    const [sql, params] = connection.execute.mock.calls[0];
    expect((sql.match(/\?/g) || [])).toHaveLength(params.length);
    expect(params).toHaveLength(11);
  });

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
