const {
  authRequest,
  closeIntegrationPool,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('dashboard integration', () => {
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('store owner can fetch backend dashboard data structure', async () => {
    if (!dbReady) return;

    const token = await loginOwner();
    const response = await authRequest(token).get('/api/dashboard').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.dashboard).toMatchObject({
      summary: expect.objectContaining({
        collections: expect.any(Number),
        cash_balance: expect.any(Number),
        open_receivables: expect.any(Number),
        active_dispatches: expect.any(Number),
        pending_pos_orders: expect.any(Number),
        raw_stock_value: expect.any(Number),
        packaging_stock_value: expect.any(Number),
        ready_stock_value: expect.any(Number),
        sales_revenue: expect.any(Number),
        sales_cogs: expect.any(Number),
        gift_cogs: expect.any(Number),
        net_profit: expect.any(Number)
      }),
      benchmarks: expect.any(Array),
      activity: expect.any(Array),
      pending_pos_work: expect.any(Array),
      packaging_shortages: expect.any(Array),
      sales_chart: expect.any(Array),
      notifications: expect.any(Array)
    });
  });
});
