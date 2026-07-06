const {
  app,
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  createLocationFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb,
  request
} = require('./helpers/integration');
const bcrypt = require('bcryptjs');

jest.setTimeout(120000);

describe('dispatch settlement integration', () => {
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

  test('store admins cannot access VAT settings endpoint', async () => {
    if (!dbReady) return;
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const roleResult = await dbQuery(
      `INSERT INTO roles (store_id, name, display_name, is_system_role, status)
       VALUES (1, ?, ?, 0, 'active')`,
      [`settings_admin_${suffix}`, 'Settings Admin']
    );
    const permissionRows = await dbQuery(
      `SELECT id FROM permissions WHERE permission_key = 'settings.manage' LIMIT 1`
    );
    await dbQuery(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
      [roleResult.insertId, permissionRows[0].id]
    );
    await dbQuery(
      `INSERT INTO users (
        store_id, role_id, full_name, username, email, password_hash, status
      ) VALUES (1, ?, 'Settings Admin', ?, ?, ?, 'active')`,
      [
        roleResult.insertId,
        `settings_admin_${suffix}`,
        `settings_admin_${suffix}@example.com`,
        await bcrypt.hash('ChangeMe123!', 4)
      ]
    );
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ login: `settings_admin_${suffix}`, password: 'ChangeMe123!' })
      .expect(200);
    const settingsAdminToken = loginResponse.body.data.token;

    await authRequest(settingsAdminToken).get('/api/settings/vat').expect(403);
    await authRequest(settingsAdminToken)
      .patch('/api/settings/vat')
      .send({ enabled: true, rate: 10 })
      .expect(403);
  });

  test('dispatch, partial settlement, debt, receipt, and PDFs are created', async () => {
    if (!dbReady) return;

    const inventory = await createInventoryFixture(token, 'dispatch');
    const market = await createLocationFixture(token, 'dispatch');
    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `Dispatch Cash ${Date.now()}`,
        account_type: 'cash',
        opening_balance: 0
      })
      .expect(201);
    const cashAccountId = cashAccountResponse.body.data.cash_account.id;

    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        warehouse_id: inventory.warehouse.id,
        item_variant_id: inventory.variant.id,
        quantity_change: 20,
        unit_cost: 2,
        reason: 'Dispatch stock'
      })
      .expect(201);

    const noVatDispatchResponse = await authRequest(token)
      .post('/api/dispatch-requests')
      .send({
        salesman_id: market.salesman.id,
        warehouse_id: inventory.warehouse.id,
        request_date: '2026-05-25'
      })
      .expect(201);

    const noVatCustomerResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${noVatDispatchResponse.body.data.dispatch_request.id}/customers`)
      .send({ customer_id: market.customer.id })
      .expect(201);

    const noVatItemResponse = await authRequest(token)
      .post(`/api/dispatch-customers/${noVatCustomerResponse.body.data.dispatch_customer.id}/items`)
      .send({
        item_variant_id: inventory.variant.id,
        quantity: 1,
        unit_price: 5,
        unit_cost: 2
      })
      .expect(201);

    expect(Number(noVatItemResponse.body.data.dispatch_item.subtotal_amount)).toBe(5);
    expect(Number(noVatItemResponse.body.data.dispatch_item.vat_amount)).toBe(0);
    expect(Number(noVatItemResponse.body.data.dispatch_item.line_total)).toBe(5);

    await dbQuery(
      `UPDATE system_settings
       SET setting_value = CASE setting_key
         WHEN 'sales.vat.enabled' THEN 'true'
         WHEN 'sales.vat.rate' THEN '10'
         ELSE setting_value
       END
       WHERE store_id = 1
         AND setting_key IN ('sales.vat.enabled', 'sales.vat.rate')`
    );

    const dispatchResponse = await authRequest(token)
      .post('/api/dispatch-requests')
      .send({
        salesman_id: market.salesman.id,
        warehouse_id: inventory.warehouse.id,
        request_date: '2026-05-26'
      })
      .expect(201);

    const dispatchId = dispatchResponse.body.data.dispatch_request.id;
    const dispatchCustomerResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/customers`)
      .send({ customer_id: market.customer.id })
      .expect(201);

    const vatItemResponse = await authRequest(token)
      .post(`/api/dispatch-customers/${dispatchCustomerResponse.body.data.dispatch_customer.id}/items`)
      .send({
        item_variant_id: inventory.variant.id,
        quantity: 2,
        unit_price: 5,
        unit_cost: 2
      })
      .expect(201);

    expect(Number(vatItemResponse.body.data.dispatch_item.subtotal_amount)).toBe(10);
    expect(Number(vatItemResponse.body.data.dispatch_item.vat_rate)).toBe(10);
    expect(Number(vatItemResponse.body.data.dispatch_item.vat_amount)).toBe(1);
    expect(Number(vatItemResponse.body.data.dispatch_item.line_total)).toBe(11);

    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/submit`).expect(200);
    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/approve`).expect(200);
    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/dispatch`).expect(200);

    await authRequest(token)
      .get(`/api/dispatch-requests/${dispatchId}/print-summary?format=pdf`)
      .expect('Content-Type', /application\/pdf/)
      .expect(200);

    const settlementResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/settlements`)
      .send({
        settlement_date: '2026-05-26'
      })
      .expect(201);

    const settlementId = settlementResponse.body.data.dispatch_settlement.id;

    await authRequest(token)
      .post(`/api/dispatch-settlements/${settlementId}/complete`)
      .send({
        payment_method: 'cash',
        cash_account_id: cashAccountId,
        due_date: '2026-06-26',
        customers: [
          {
            dispatch_customer_id: dispatchCustomerResponse.body.data.dispatch_customer.id,
            settlement_status: 'partial',
            collected_amount: 4,
            notes: 'Partial payment'
          }
        ]
      })
      .expect(200);

    const [debt] = await dbQuery('SELECT * FROM customer_debts WHERE dispatch_request_id = ?', [dispatchId]);
    const [payment] = await dbQuery('SELECT * FROM customer_payments WHERE dispatch_request_id = ?', [dispatchId]);
    const [receipt] = await dbQuery('SELECT * FROM customer_receipts WHERE dispatch_request_id = ?', [dispatchId]);
    const [salesmanBalance] = await dbQuery('SELECT * FROM salesman_balances WHERE dispatch_request_id = ?', [dispatchId]);

    expect(Number(debt.remaining_amount)).toBe(7);
    expect(Number(debt.vat_amount)).toBeCloseTo(0.6364, 4);
    expect(Number(payment.amount)).toBe(4);
    expect(Number(receipt.total_amount)).toBe(11);
    expect(Number(receipt.vat_amount)).toBe(1);
    expect(Number(receipt.remaining_amount)).toBe(7);
    expect(salesmanBalance.status).toBe('open');

    await authRequest(token)
      .post(`/api/salesman-balances/${salesmanBalance.id}/close`)
      .expect(200);

    const [closedBalance] = await dbQuery('SELECT status, closed_by, closed_at FROM salesman_balances WHERE id = ?', [salesmanBalance.id]);
    expect(closedBalance.status).toBe('closed');
    expect(closedBalance.closed_by).not.toBeNull();
    expect(closedBalance.closed_at).not.toBeNull();

    const salesReportResponse = await authRequest(token)
      .get('/api/reports/sales')
      .expect(200);
    expect(salesReportResponse.body.data.sales.some((row) => Number(row.vat_amount) === 1)).toBe(true);

    const csvResponse = await authRequest(token)
      .get('/api/reports/sales?format=csv')
      .expect('Content-Type', /text\/csv/)
      .expect(200);
    expect(csvResponse.text).toContain('vat_amount');

    await authRequest(token)
      .post(`/api/customer-debts/${debt.id}/payments`)
      .send({
        payment_date: '2026-05-27',
        amount: 7,
        payment_method: 'cash',
        cash_account_id: cashAccountId
      })
      .expect(201);

    const [paidDebt] = await dbQuery('SELECT status, remaining_amount FROM customer_debts WHERE id = ?', [debt.id]);
    expect(paidDebt.status).toBe('paid');
    expect(Number(paidDebt.remaining_amount)).toBe(0);

    const paidDispatchResponse = await authRequest(token)
      .get(`/api/dispatch-requests/${dispatchId}`)
      .expect(200);
    expect(Number(paidDispatchResponse.body.data.dispatch_request.outstanding_debt_amount)).toBe(0);

    const paidDebtResponse = await authRequest(token)
      .get(`/api/customer-debts/${debt.id}`)
      .expect(200);
    expect(Number(paidDebtResponse.body.data.customer_debt.outstanding_debt_amount)).toBe(0);

    const paidBalanceResponse = await authRequest(token)
      .get(`/api/salesman-balances/${salesmanBalance.id}`)
      .expect(200);
    expect(Number(paidBalanceResponse.body.data.salesman_balance.outstanding_debt_amount)).toBe(0);

    const dispatchSummaryResponse = await authRequest(token)
      .get('/api/reports/dispatch-summary')
      .expect(200);
    const summaryRow = dispatchSummaryResponse.body.data.dispatch_summary.find(
      (row) => Number(row.dispatch_request_id) === Number(dispatchId)
    );
    expect(summaryRow).toBeDefined();
    expect(Number(summaryRow.outstanding_debt_amount)).toBe(0);

    await authRequest(token)
      .get(`/api/customer-receipts/${receipt.id}/print?format=pdf`)
      .expect('Content-Type', /application\/pdf/)
      .expect(200);
  });

  test('dispatch returns are only accepted before settlement and create returned stock', async () => {
    if (!dbReady) return;

    const inventory = await createInventoryFixture(token, 'return_flow');
    const market = await createLocationFixture(token, 'return_flow');

    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        warehouse_id: inventory.warehouse.id,
        item_variant_id: inventory.variant.id,
        quantity_change: 10,
        unit_cost: 2,
        reason: 'Return flow stock'
      })
      .expect(201);

    const dispatchResponse = await authRequest(token)
      .post('/api/dispatch-requests')
      .send({
        salesman_id: market.salesman.id,
        warehouse_id: inventory.warehouse.id,
        request_date: '2026-05-28'
      })
      .expect(201);

    const dispatchId = dispatchResponse.body.data.dispatch_request.id;
    const dispatchCustomerResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/customers`)
      .send({ customer_id: market.customer.id })
      .expect(201);

    const itemResponse = await authRequest(token)
      .post(`/api/dispatch-customers/${dispatchCustomerResponse.body.data.dispatch_customer.id}/items`)
      .send({
        item_variant_id: inventory.variant.id,
        quantity: 3,
        unit_price: 5,
        unit_cost: 2
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/returns`)
      .send({
        dispatch_item_id: itemResponse.body.data.dispatch_item.id,
        returned_quantity: 1,
        reason: 'Too early'
      })
      .expect(409);

    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/submit`).expect(200);
    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/approve`).expect(200);
    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/dispatch`).expect(200);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/returns`)
      .send({
        dispatch_item_id: itemResponse.body.data.dispatch_item.id,
        returned_quantity: 1,
        reason: 'Returned by customer'
      })
      .expect(201);

    const [returnRow] = await dbQuery('SELECT returned_quantity FROM dispatch_returns WHERE dispatch_request_id = ?', [dispatchId]);
    expect(Number(returnRow.returned_quantity)).toBe(1);

    const [balance] = await dbQuery(
      'SELECT quantity_on_hand FROM stock_balances WHERE warehouse_id = ? AND item_variant_id = ?',
      [inventory.warehouse.id, inventory.variant.id]
    );
    expect(Number(balance.quantity_on_hand)).toBe(8);

    const activeSettlementResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/settlements`)
      .send({ settlement_date: '2026-05-28' })
      .expect(201);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/returns`)
      .send({
        dispatch_item_id: itemResponse.body.data.dispatch_item.id,
        returned_quantity: 1,
        reason: 'Too late'
      })
      .expect(409);

    await authRequest(token)
      .post(`/api/dispatch-settlements/${activeSettlementResponse.body.data.dispatch_settlement.id}/cancel`)
      .expect(200);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/returns`)
      .send({
        dispatch_item_id: itemResponse.body.data.dispatch_item.id,
        returned_quantity: 1,
        reason: 'After cancelling draft settlement'
      })
      .expect(201);

    const settlementReturnResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/settlements`)
      .send({ settlement_date: '2026-05-28' })
      .expect(201);

    await authRequest(token)
      .post(`/api/dispatch-settlements/${settlementReturnResponse.body.data.dispatch_settlement.id}/complete`)
      .send({
        payment_method: 'cash',
        customers: [
          {
            dispatch_customer_id: dispatchCustomerResponse.body.data.dispatch_customer.id,
            settlement_status: 'completed',
            return_items: [
              {
                dispatch_item_id: itemResponse.body.data.dispatch_item.id,
                returned_quantity: 1
              }
            ],
            notes: 'Returned during settlement'
          }
        ]
      })
      .expect(200);

    const [settledCustomer] = await dbQuery(
      'SELECT expected_amount, collected_amount, debt_amount FROM dispatch_settlement_customers WHERE dispatch_settlement_id = ?',
      [settlementReturnResponse.body.data.dispatch_settlement.id]
    );
    expect(Number(settledCustomer.expected_amount)).toBe(0);
    expect(Number(settledCustomer.collected_amount)).toBe(0);
    expect(Number(settledCustomer.debt_amount)).toBe(0);

    const [finalBalance] = await dbQuery(
      'SELECT quantity_on_hand FROM stock_balances WHERE warehouse_id = ? AND item_variant_id = ?',
      [inventory.warehouse.id, inventory.variant.id]
    );
    expect(Number(finalBalance.quantity_on_hand)).toBe(10);
  });

  test('dispatch submit rejects orphan customers and customer add enforces salesman territory', async () => {
    if (!dbReady) return;

    const inventory = await createInventoryFixture(token, 'dispatch_hardening');
    const assignedMarket = await createLocationFixture(token, 'dispatch_assigned');
    const otherMarket = await createLocationFixture(token, 'dispatch_other');
    const unassignedLocationResponse = await authRequest(token)
      .post('/api/locations')
      .send({ name: `No Route Location ${Date.now()}`, code: `NRL_${Date.now()}` })
      .expect(201);
    const unassignedSublocationResponse = await authRequest(token)
      .post('/api/sublocations')
      .send({
        location_id: unassignedLocationResponse.body.data.location.id,
        name: `No Route Sublocation ${Date.now()}`,
        code: `NRS_${Date.now()}`
      })
      .expect(201);
    const unassignedCustomerResponse = await authRequest(token)
      .post('/api/customers')
      .send({
        name: `No Route Customer ${Date.now()}`,
        location_id: unassignedLocationResponse.body.data.location.id,
        sublocation_id: unassignedSublocationResponse.body.data.sublocation.id
      })
      .expect(201);

    const dispatchResponse = await authRequest(token)
      .post('/api/dispatch-requests')
      .send({
        salesman_id: assignedMarket.salesman.id,
        warehouse_id: inventory.warehouse.id,
        request_date: '2026-05-28'
      })
      .expect(201);
    const dispatchId = dispatchResponse.body.data.dispatch_request.id;

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/customers`)
      .send({ customer_id: otherMarket.customer.id })
      .expect(400);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/customers`)
      .send({ customer_id: unassignedCustomerResponse.body.data.customer.id })
      .expect(400);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/customers`)
      .send({ customer_id: assignedMarket.customer.id })
      .expect(201);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/submit`)
      .expect(409);
  });

  test('generic customer payment allocates to oldest open debts', async () => {
    if (!dbReady) return;

    const market = await createLocationFixture(token, 'payment_alloc');
    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `Payment Alloc Cash ${Date.now()}`,
        account_type: 'cash',
        opening_balance: 0
      })
      .expect(201);
    await dbQuery(
      `INSERT INTO customer_debts (
        store_id, customer_id, debt_date, subtotal_amount, vat_amount,
        original_amount, paid_amount, remaining_amount, status
      ) VALUES
        (1, ?, '2026-05-01', 10, 0, 10, 0, 10, 'pending'),
        (1, ?, '2026-05-02', 8, 0, 8, 0, 8, 'pending')`,
      [market.customer.id, market.customer.id]
    );

    const response = await authRequest(token)
      .post('/api/customer-payments')
      .send({
        customer_id: market.customer.id,
        payment_date: '2026-05-29',
        amount: 20,
        payment_method: 'cash',
        cash_account_id: cashAccountResponse.body.data.cash_account.id
      })
      .expect(201);

    expect(response.body.data.payment.unallocated_amount).toBe('0.0000');
    expect(response.body.data.payment.credit_amount).toBe('2.0000');
    expect(response.body.data.payment.allocations).toHaveLength(2);

    const debts = await dbQuery(
      'SELECT status, remaining_amount FROM customer_debts WHERE customer_id = ? ORDER BY debt_date ASC',
      [market.customer.id]
    );
    expect(debts.map((debt) => [debt.status, Number(debt.remaining_amount)])).toEqual([
      ['paid', 0],
      ['paid', 0]
    ]);

    await dbQuery(
      `INSERT INTO customer_debts (
        store_id, customer_id, debt_date, subtotal_amount, vat_amount,
        original_amount, paid_amount, remaining_amount, status
      ) VALUES (1, ?, '2026-05-03', 5, 0, 5, 0, 5, 'pending')`,
      [market.customer.id]
    );
    const [creditDebt] = await dbQuery(
      'SELECT id FROM customer_debts WHERE customer_id = ? ORDER BY debt_date DESC LIMIT 1',
      [market.customer.id]
    );

    await authRequest(token)
      .post(`/api/customer-debts/${creditDebt.id}/apply-credit`)
      .send({})
      .expect(201);

    const [creditAppliedDebt] = await dbQuery(
      'SELECT status, paid_amount, remaining_amount FROM customer_debts WHERE id = ?',
      [creditDebt.id]
    );
    expect(creditAppliedDebt.status).toBe('partially_paid');
    expect(Number(creditAppliedDebt.paid_amount)).toBe(2);
    expect(Number(creditAppliedDebt.remaining_amount)).toBe(3);

    const creditRows = await dbQuery(
      'SELECT direction, amount FROM customer_credits WHERE customer_id = ? ORDER BY id ASC',
      [market.customer.id]
    );
    expect(creditRows.map((row) => [row.direction, Number(row.amount)])).toEqual([
      ['credit', 2],
      ['debit', 2]
    ]);

    const [debtRow] = await dbQuery(
      'SELECT id, paid_amount FROM customer_debts WHERE customer_id = ? ORDER BY debt_date DESC LIMIT 1',
      [market.customer.id]
    );
    await authRequest(token)
      .patch(`/api/customer-debts/${debtRow.id}/status`)
      .send({ status: 'written_off' })
      .expect(200);

    const [writtenOffDebt] = await dbQuery(
      'SELECT status, paid_amount, remaining_amount FROM customer_debts WHERE id = ?',
      [debtRow.id]
    );
    expect(writtenOffDebt.status).toBe('written_off');
    expect(Number(writtenOffDebt.paid_amount)).toBe(Number(debtRow.paid_amount));
    expect(Number(writtenOffDebt.remaining_amount)).toBe(0);

    const [adjustment] = await dbQuery(
      'SELECT adjustment_type, amount FROM customer_debt_adjustments WHERE customer_debt_id = ?',
      [debtRow.id]
    );
    expect(adjustment.adjustment_type).toBe('write_off');
    expect(Number(adjustment.amount)).toBe(3);
  });
});
