const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('audit integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) {
      token = await loginOwner();
    }
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('critical stock mutation creates an audit log row', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'audit');

    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        warehouse_id: fixture.warehouse.id,
        item_id: fixture.item.id,
        quantity_change: 3,
        unit_cost: 2,
        reason: 'Audit integration adjustment'
      })
      .expect(201);

    const rows = await dbQuery(
      `SELECT module, action, table_name, new_values
       FROM audit_logs
       WHERE module = 'inventory' AND action = 'stock_adjustment'
       ORDER BY id DESC
       LIMIT 1`
    );

    expect(rows[0]).toMatchObject({
      module: 'inventory',
      action: 'stock_adjustment',
      table_name: 'item_stock_balances'
    });
    expect(JSON.stringify(rows[0].new_values)).toContain('stock_movement_id');
  });
});
