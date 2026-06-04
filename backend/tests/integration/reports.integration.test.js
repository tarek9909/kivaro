const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  createLocationFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(120000);

describe('reports integration', () => {
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

  test('report endpoints return JSON rows and CSV exports', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'reports');

    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        warehouse_id: fixture.warehouse.id,
        item_variant_id: fixture.variant.id,
        quantity_change: 7,
        unit_cost: 2,
        reason: 'Report stock'
      })
      .expect(201);

    const jsonResponse = await authRequest(token)
      .get('/api/reports/current-stock')
      .expect(200);

    expect(jsonResponse.body.data.current_stock.length).toBeGreaterThan(0);

    const csvResponse = await authRequest(token)
      .get('/api/reports/current-stock?format=csv')
      .expect('Content-Type', /text\/csv/)
      .expect(200);

    expect(csvResponse.text).toContain('warehouse_name');
  });

  test('profit-loss uses completed sales, costs, expenses, and write-offs', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'profit_loss');
    const market = await createLocationFixture(token, 'profit_loss');
    const accountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `P&L Cash ${Date.now()}`,
        account_type: 'cash',
        opening_balance: 100
      })
      .expect(201);
    expect(Number(accountResponse.body.data.cash_account.current_balance)).toBe(100);

    const categoryResponse = await authRequest(token)
      .post('/api/expense-categories')
      .send({ name: `P&L Expenses ${Date.now()}` })
      .expect(201);

    await authRequest(token)
      .post('/api/expenses')
      .send({
        expense_category_id: categoryResponse.body.data.expense_category.id,
        expense_date: '2026-05-20',
        amount: 5,
        payment_method: 'cash',
        cash_account_id: accountResponse.body.data.cash_account.id,
        description: 'P&L expense'
      })
      .expect(201);

    await dbQuery(
      `INSERT INTO dispatch_requests (
        store_id, dispatch_number, salesman_id, warehouse_id, request_date, status,
        total_quantity, subtotal_amount, vat_amount, total_amount, total_collected,
        total_debt, completed_at, created_by
      ) VALUES (1, ?, ?, ?, '2026-05-20', 'completed', 1, 20, 0, 20, 20, 0, '2026-05-20 10:00:00', 1)`,
      [`PL-DISP-${Date.now()}`, market.salesman.id, fixture.warehouse.id]
    );
    const [dispatchRow] = await dbQuery('SELECT id FROM dispatch_requests ORDER BY id DESC LIMIT 1');

    await dbQuery(
      `INSERT INTO dispatch_customers (
        store_id, dispatch_request_id, customer_id, location_id, sublocation_id,
        subtotal_amount, customer_total_amount, collected_amount, debt_amount,
        payment_status, receipt_number
      ) VALUES (1, ?, ?, ?, ?, 20, 20, 20, 0, 'paid', ?)`,
      [dispatchRow.id, market.customer.id, market.location.id, market.sublocation.id, `PL-RCP-${Date.now()}`]
    );
    const [dispatchCustomerRow] = await dbQuery('SELECT id FROM dispatch_customers ORDER BY id DESC LIMIT 1');
    await dbQuery(
      `INSERT INTO dispatch_items (
        dispatch_customer_id, dispatch_request_id, item_variant_id, quantity,
        unit_price, unit_cost, subtotal_amount, vat_rate, vat_amount, line_total
      ) VALUES (?, ?, ?, 1, 20, 6, 20, 0, 0, 20)`,
      [dispatchCustomerRow.id, dispatchRow.id, fixture.variant.id]
    );
    await dbQuery(
      `INSERT INTO customer_debts (
        store_id, customer_id, debt_date, subtotal_amount, vat_amount,
        original_amount, paid_amount, remaining_amount, status, updated_at
      ) VALUES (1, ?, '2026-05-20', 3, 0, 3, 1, 0, 'written_off', '2026-05-20 11:00:00')`,
      [market.customer.id]
    );
    const [debtRow] = await dbQuery('SELECT id FROM customer_debts ORDER BY id DESC LIMIT 1');
    await dbQuery(
      `INSERT INTO customer_debt_adjustments (
        store_id, customer_debt_id, customer_id, salesman_id,
        dispatch_request_id, dispatch_customer_id, adjustment_type,
        amount, created_by, created_at
      ) VALUES (1, ?, ?, ?, ?, ?, 'write_off', 2, 1, '2026-05-20 11:00:00')`,
      [
        debtRow.id,
        market.customer.id,
        market.salesman.id,
        dispatchRow.id,
        dispatchCustomerRow.id
      ]
    );

    const response = await authRequest(token)
      .get('/api/reports/profit-loss?date_from=2026-05-20&date_to=2026-05-20')
      .expect(200);

    const [row] = response.body.data.profit_loss;
    expect(Number(row.sales_revenue)).toBeGreaterThanOrEqual(20);
    expect(Number(row.cost_of_goods_sold)).toBeGreaterThanOrEqual(6);
    expect(Number(row.operating_expenses)).toBeGreaterThanOrEqual(5);
    expect(Number(row.debt_write_offs)).toBeGreaterThanOrEqual(2);
  });
});
