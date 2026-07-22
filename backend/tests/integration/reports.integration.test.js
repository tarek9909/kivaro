const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  loginOwner,
  prepareIntegrationDb,
  receiveFixtureStock
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('item-based reports integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) token = await loginOwner();
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('returns normal item stock in JSON and CSV from canonical balances', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'report_stock', { receive: false });
    await receiveFixtureStock(token, fixture, { quantity: 7, unit_cost: 2 });

    const jsonResponse = await authRequest(token)
      .get(`/api/reports/normal-stock?warehouse_id=${fixture.warehouse.id}`)
      .expect(200);

    expect(jsonResponse.body.data.normal_stock).toEqual(expect.arrayContaining([
      expect.objectContaining({ item_id: fixture.item.id, item_kind: 'normal', stock_mode: 'piece' })
    ]));

    const csvResponse = await authRequest(token)
      .get(`/api/reports/current-stock?warehouse_id=${fixture.warehouse.id}&format=csv`)
      .expect('Content-Type', /text\/csv/)
      .expect(200);
    expect(csvResponse.text).toContain('warehouse_name');
    expect(csvResponse.text).toContain('quantity_available');
  });

  test('uses the same date-filter contract for P&L and rejects unknown legacy filters', async () => {
    if (!dbReady) return;

    const profitLoss = await authRequest(token)
      .get('/api/reports/profit-loss?date_from=2026-07-01&date_to=2026-07-31')
      .expect(200);
    expect(profitLoss.body.data.profit_loss[0]).toEqual(expect.objectContaining({
      sales_revenue: expect.anything(),
      sales_cogs: expect.anything(),
      gift_cogs: expect.anything()
    }));

    await authRequest(token)
      .get('/api/reports/current-stock?obsolete_stock_key=1')
      .expect(400);
  });
});
