const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  createLocationFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('commission integration', () => {
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

  test('target generation, calculation, approval, and payment complete', async () => {
    if (!dbReady) return;

    const inventory = await createInventoryFixture(token, 'commission');
    const market = await createLocationFixture(token, 'commission');

    // Create an active commission rule covering the target period (May 2026)
    await authRequest(token)
      .post('/api/commission-rules')
      .send({
        name: 'Integration Test Commission Rule',
        target_period: 'monthly',
        below_target_rate: 5.0000,
        at_target_rate: 10.0000,
        above_target_extra_rate: 1.0000,
        applies_from: '2026-05-01',
        status: 'active'
      })
      .expect(201);
    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `Commission Cash ${Date.now()}`,
        account_type: 'cash',
        opening_balance: 100
      })
      .expect(201);
    const cashAccountId = cashAccountResponse.body.data.cash_account.id;

    const locationTargetResponse = await authRequest(token)
      .post('/api/location-targets')
      .send({
        location_id: market.location.id,
        target_period: 'monthly',
        period_start: '2026-05-01',
        period_end: '2026-05-31',
        target_amount: 100,
        status: 'active'
      })
      .expect(201);

    const sublocationTargetResponse = await authRequest(token)
      .post(`/api/location-targets/${locationTargetResponse.body.data.location_target.id}/sublocation-targets`)
      .send({
        sublocation_id: market.sublocation.id,
        target_amount: 100,
        status: 'active'
      })
      .expect(201);

    const salesmanTargetResponse = await authRequest(token)
      .post(`/api/sublocation-targets/${sublocationTargetResponse.body.data.sublocation_target.id}/generate-salesman-targets`)
      .expect(200);

    const salesmanTarget = salesmanTargetResponse.body.data.salesman_targets[0];

    await dbQuery(
      `INSERT INTO dispatch_requests (
        store_id,
        dispatch_number,
        salesman_id,
        warehouse_id,
        request_date,
        status,
        total_quantity,
        subtotal_amount,
        total_amount,
        total_collected,
        total_debt,
        created_by
      ) VALUES (1, ?, ?, ?, ?, 'completed', 1, 150, 150, 150, 0, 1)`,
      [`COM-DISP-${Date.now()}`, market.salesman.id, inventory.warehouse.id, '2026-05-15']
    );
    const [dispatchRow] = await dbQuery('SELECT id FROM dispatch_requests ORDER BY id DESC LIMIT 1');

    await dbQuery(
      `INSERT INTO dispatch_customers (
        store_id,
        dispatch_request_id,
        customer_id,
        location_id,
        sublocation_id,
        subtotal_amount,
        customer_total_amount,
        collected_amount,
        debt_amount,
        payment_status,
        receipt_number
      ) VALUES (1, ?, ?, ?, ?, 150, 150, 150, 0, 'paid', ?)`,
      [
        dispatchRow.id,
        market.customer.id,
        market.location.id,
        market.sublocation.id,
        `COM-RCP-${Date.now()}`
      ]
    );
    const [dispatchCustomerRow] = await dbQuery('SELECT id FROM dispatch_customers ORDER BY id DESC LIMIT 1');

    await dbQuery(
      `INSERT INTO dispatch_items (
        dispatch_customer_id,
        dispatch_request_id,
        item_variant_id,
        quantity,
        unit_price,
        unit_cost,
        subtotal_amount,
        vat_rate,
        vat_amount,
        line_total
      ) VALUES (?, ?, ?, 1, 150, 2, 150, 0, 0, 150)`,
      [dispatchCustomerRow.id, dispatchRow.id, inventory.variant.id]
    );

    const calculateResponse = await authRequest(token)
      .post('/api/commissions/calculate')
      .send({ salesman_target_id: salesmanTarget.id })
      .expect(201);

    const commission = calculateResponse.body.data.commission;
    expect(Number(commission.total_commission)).toBe(10.5);

    await authRequest(token)
      .post('/api/commissions/calculate')
      .send({ salesman_target_id: salesmanTarget.id })
      .expect(409);

    await authRequest(token).post(`/api/commissions/${commission.id}/approve`).expect(200);
    await authRequest(token)
      .post(`/api/commissions/${commission.id}/pay`)
      .send({
        payment_date: '2026-05-26',
        amount: 1,
        payment_method: 'cash',
        cash_account_id: cashAccountId
      })
      .expect(409);

    await authRequest(token)
      .post(`/api/commissions/${commission.id}/pay`)
      .send({
        payment_date: '2026-05-26',
        payment_method: 'cash',
        cash_account_id: cashAccountId
      })
      .expect(201);

    const [paidCommission] = await dbQuery('SELECT status FROM commission_calculations WHERE id = ?', [commission.id]);
    const [payment] = await dbQuery('SELECT amount FROM commission_payments WHERE commission_calculation_id = ?', [commission.id]);

    expect(paidCommission.status).toBe('paid');
    expect(Number(payment.amount)).toBe(10.5);

    await authRequest(token)
      .post(`/api/sublocation-targets/${sublocationTargetResponse.body.data.sublocation_target.id}/generate-salesman-targets`)
      .expect(200);

    const [supersededTarget] = await dbQuery(
      'SELECT status FROM salesman_targets WHERE id = ?',
      [salesmanTarget.id]
    );
    const activeTargets = await dbQuery(
      `SELECT id
       FROM salesman_targets
       WHERE sublocation_target_id = ? AND salesman_id = ? AND status = 'active'`,
      [sublocationTargetResponse.body.data.sublocation_target.id, market.salesman.id]
    );
    expect(supersededTarget.status).toBe('active');
    expect(activeTargets).toHaveLength(1);
  });

  test('target generation updates existing assigned salesman targets and creates only missing targets', async () => {
    if (!dbReady) return;

    const market = await createLocationFixture(token, 'target_reconcile');

    const locationTargetResponse = await authRequest(token)
      .post('/api/location-targets')
      .send({
        location_id: market.location.id,
        target_period: 'monthly',
        period_start: '2026-06-01',
        period_end: '2026-06-30',
        target_amount: 100,
        status: 'active'
      })
      .expect(201);

    const sublocationTargetResponse = await authRequest(token)
      .post(`/api/location-targets/${locationTargetResponse.body.data.location_target.id}/sublocation-targets`)
      .send({
        sublocation_id: market.sublocation.id,
        target_amount: 100,
        status: 'active'
      })
      .expect(201);

    const firstGenerate = await authRequest(token)
      .post(`/api/sublocation-targets/${sublocationTargetResponse.body.data.sublocation_target.id}/generate-salesman-targets`)
      .expect(200);
    const originalTarget = firstGenerate.body.data.salesman_targets[0];

    await dbQuery(
      'UPDATE salesman_targets SET achieved_sales_amount = 25 WHERE id = ?',
      [originalTarget.id]
    );

    const secondSalesman = await authRequest(token)
      .post('/api/salesmen')
      .send({
        full_name: 'Target Reconcile Salesman 2',
        email: `reconcile_2_${Date.now()}@example.com`,
        joined_at: '2026-06-01'
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/salesmen/${secondSalesman.body.data.salesman.id}/sublocations`)
      .send({
        sublocation_id: market.sublocation.id,
        assigned_at: '2026-06-01'
      })
      .expect(201);

    const secondGenerate = await authRequest(token)
      .post(`/api/sublocation-targets/${sublocationTargetResponse.body.data.sublocation_target.id}/generate-salesman-targets`)
      .expect(200);

    expect(secondGenerate.body.data.salesman_targets).toHaveLength(2);
    const targets = await dbQuery(
      `SELECT id, salesman_id, target_amount, achieved_sales_amount, status
       FROM salesman_targets
       WHERE sublocation_target_id = ? AND status = 'active'
       ORDER BY salesman_id ASC`,
      [sublocationTargetResponse.body.data.sublocation_target.id]
    );
    expect(targets).toHaveLength(2);
    expect(targets.map((target) => Number(target.target_amount))).toEqual([50, 50]);
    expect(targets.find((target) => Number(target.id) === Number(originalTarget.id))).toMatchObject({
      status: 'active'
    });
    expect(Number(targets.find((target) => Number(target.id) === Number(originalTarget.id)).achieved_sales_amount)).toBe(25);

    await authRequest(token)
      .post(`/api/sublocation-targets/${sublocationTargetResponse.body.data.sublocation_target.id}/generate-salesman-targets`)
      .expect(200);
    const activeAfterThirdGenerate = await dbQuery(
      `SELECT id
       FROM salesman_targets
       WHERE sublocation_target_id = ? AND status = 'active'`,
      [sublocationTargetResponse.body.data.sublocation_target.id]
    );
    expect(activeAfterThirdGenerate).toHaveLength(2);
  });

  test('target generation requires full allocation and splits rounding exactly', async () => {
    if (!dbReady) return;

    const market = await createLocationFixture(token, 'target_rounding');

    const secondSalesman = await authRequest(token)
      .post('/api/salesmen')
      .send({
        full_name: 'Target Rounding Salesman 2',
        email: `rounding_2_${Date.now()}@example.com`,
        joined_at: '2026-05-01'
      })
      .expect(201);
    const thirdSalesman = await authRequest(token)
      .post('/api/salesmen')
      .send({
        full_name: 'Target Rounding Salesman 3',
        email: `rounding_3_${Date.now()}@example.com`,
        joined_at: '2026-05-01'
      })
      .expect(201);

    for (const salesman of [secondSalesman, thirdSalesman]) {
      await authRequest(token)
        .post(`/api/salesmen/${salesman.body.data.salesman.id}/sublocations`)
        .send({
          sublocation_id: market.sublocation.id,
          assigned_at: '2026-05-01'
        })
        .expect(201);
    }

    const locationTargetResponse = await authRequest(token)
      .post('/api/location-targets')
      .send({
        location_id: market.location.id,
        target_period: 'monthly',
        period_start: '2026-06-01',
        period_end: '2026-06-30',
        target_amount: 100,
        status: 'active'
      })
      .expect(201);

    const partialSublocationTarget = await authRequest(token)
      .post(`/api/location-targets/${locationTargetResponse.body.data.location_target.id}/sublocation-targets`)
      .send({
        sublocation_id: market.sublocation.id,
        target_amount: 99,
        status: 'active'
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/sublocation-targets/${partialSublocationTarget.body.data.sublocation_target.id}/generate-salesman-targets`)
      .expect(409);

    await dbQuery('UPDATE sublocation_targets SET target_amount = 100 WHERE id = ?', [
      partialSublocationTarget.body.data.sublocation_target.id
    ]);

    const generatedResponse = await authRequest(token)
      .post(`/api/sublocation-targets/${partialSublocationTarget.body.data.sublocation_target.id}/generate-salesman-targets`)
      .expect(200);

    const sum = generatedResponse.body.data.salesman_targets.reduce(
      (total, target) => total + Number(target.target_amount),
      0
    );
    expect(sum).toBeCloseTo(100, 4);
  });

  test('unassigning a salesman removes territory ownership for customers', async () => {
    if (!dbReady) return;

    const market = await createLocationFixture(token, 'unassign');

    await authRequest(token)
      .delete(`/api/salesmen/${market.salesman.id}/sublocations/${market.sublocation.id}`)
      .expect(200);
    await authRequest(token)
      .post(`/api/salesmen/${market.salesman.id}/sublocations`)
      .send({
        sublocation_id: market.sublocation.id,
        assigned_at: '2026-05-15'
      })
      .expect(201);
    await authRequest(token)
      .delete(`/api/salesmen/${market.salesman.id}/sublocations/${market.sublocation.id}`)
      .expect(200);

    const activeRows = await dbQuery(
      `SELECT id
       FROM salesman_sublocations
       WHERE salesman_id = ? AND sublocation_id = ? AND status = 'active'`,
      [market.salesman.id, market.sublocation.id]
    );
    expect(activeRows).toHaveLength(0);

    await authRequest(token)
      .post('/api/customers')
      .send({
        name: 'Unassigned customer',
        location_id: market.location.id,
        sublocation_id: market.sublocation.id,
        assigned_salesman_id: market.salesman.id
      })
      .expect(400);
  });
});
