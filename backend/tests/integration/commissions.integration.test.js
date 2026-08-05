const {
  authRequest,
  closeIntegrationPool,
  createLocationFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');
const commissionService = require('../../src/modules/commissions/commissions.service');

jest.setTimeout(30000);

describe('commission integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) token = await loginOwner();
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('the active target bundle requires exact allocations and creates assigned targets', async () => {
    if (!dbReady) return;
    const market = await createLocationFixture(token, 'target_bundle');

    await authRequest(token)
      .post('/api/location-targets/bundle')
      .send({
        location_id: market.location.id,
        target_period: 'monthly',
        period_start: '2027-06-01',
        target_amount: 100,
        sublocation_targets: [{ sublocation_id: market.sublocation.id, target_amount: 99, salesman_ids: [market.salesman.id] }]
      })
      .expect(400);

    const response = await authRequest(token)
      .post('/api/location-targets/bundle')
      .send({
        location_id: market.location.id,
        target_period: 'monthly',
        period_start: '2027-06-01',
        target_amount: 100,
        sublocation_targets: [{ sublocation_id: market.sublocation.id, target_amount: 100, salesman_ids: [market.salesman.id] }]
      })
      .expect(201);

    expect(response.body.data.location_target.status).toBe('active');
    const targets = await dbQuery(
      `SELECT st.target_amount, st.status
       FROM salesman_targets st
       JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
       WHERE slt.location_target_id = ? AND st.salesman_id = ?`,
      [response.body.data.location_target.id, market.salesman.id]
    );
    expect(targets).toHaveLength(1);
    expect(Number(targets[0].target_amount)).toBe(100);
    expect(targets[0].status).toBe('active');
  });

  test('period close is idempotent and a commission can be paid through the active workflow', async () => {
    if (!dbReady) return;
    const market = await createLocationFixture(token, 'target_close');
    const targetResponse = await authRequest(token)
      .post('/api/location-targets/bundle')
      .send({
        location_id: market.location.id,
        target_period: 'monthly',
        period_start: '2026-06-01',
        target_amount: 100,
        sublocation_targets: [{ sublocation_id: market.sublocation.id, target_amount: 100, salesman_ids: [market.salesman.id] }]
      })
      .expect(201);
    const [salesmanTarget] = await dbQuery(
      `SELECT st.id FROM salesman_targets st
       JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
       WHERE slt.location_target_id = ? AND st.salesman_id = ?`,
      [targetResponse.body.data.location_target.id, market.salesman.id]
    );
    const [snapshot] = await dbQuery(
      `SELECT commission_rule_id, at_target_rate, above_target_extra_rate
       FROM salesman_target_commission_snapshots WHERE salesman_target_id = ?`,
      [salesmanTarget.id]
    );
    expect(Number(snapshot.commission_rule_id)).toBe(market.commission_rule.id);
    expect(Number(snapshot.at_target_rate)).toBe(10);
    await dbQuery(
      `INSERT INTO target_collection_credits
       (store_id, salesman_target_id, salesman_id, sublocation_id, source_type, source_id, amount, collection_date)
       VALUES (1, ?, ?, ?, 'payment_allocation', ?, 150, '2026-06-15')`,
      [salesmanTarget.id, market.salesman.id, market.sublocation.id, Date.now()]
    );
    // A rule can be revised or retired after an assignment.  The period must
    // still close using the assignment-time snapshot.
    await dbQuery(
      "UPDATE commission_rules SET status = 'inactive', at_target_rate = 99 WHERE id = ?",
      [market.commission_rule.id]
    );

    const firstRun = await commissionService.processDueCommissions('2026-08-01');
    const secondRun = await commissionService.processDueCommissions('2026-08-01');
    expect(firstRun.processed_count).toBe(1);
    expect(secondRun.processed_count).toBe(0);

    const [commission] = await dbQuery(
      'SELECT id, status, total_commission FROM commission_calculations WHERE salesman_target_id = ?',
      [salesmanTarget.id]
    );
    expect(commission.status).toBe('approved');
    expect(Number(commission.total_commission)).toBe(10.5);

    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({ account_name: `Commission Cash ${Date.now()}`, account_type: 'cash', cash_flow_permission: 'outgoing', opening_balance: 100 })
      .expect(201);
    await authRequest(token)
      .post(`/api/commissions/${commission.id}/pay`)
      .send({ payment_date: '2026-08-01', payment_method: 'cash', cash_account_id: cashAccountResponse.body.data.cash_account.id })
      .expect(201);
    const [paid] = await dbQuery('SELECT status FROM commission_calculations WHERE id = ?', [commission.id]);
    expect(paid.status).toBe('paid');
    const [transaction] = await dbQuery(
      "SELECT DATE_FORMAT(transaction_date, '%Y-%m-%d') AS transaction_date FROM financial_transactions WHERE reference_type = 'commission_payment' ORDER BY id DESC LIMIT 1"
    );
    expect(transaction.transaction_date).toBe('2026-08-01');
  });

  test('unassigning a salesman removes territory ownership for customers', async () => {
    if (!dbReady) return;
    const market = await createLocationFixture(token, 'unassign');
    await authRequest(token).delete(`/api/salesmen/${market.salesman.id}/sublocations/${market.sublocation.id}`).expect(200);
    const activeRows = await dbQuery(
      'SELECT id FROM salesman_sublocations WHERE salesman_id = ? AND sublocation_id = ? AND status = \'active\'',
      [market.salesman.id, market.sublocation.id]
    );
    expect(activeRows).toHaveLength(0);
    await authRequest(token)
      .post('/api/customers')
      .send({ name: 'Unassigned customer', location_id: market.location.id, sublocation_id: market.sublocation.id, assigned_salesman_id: market.salesman.id })
      .expect(400);
  });
});
