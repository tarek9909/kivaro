const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('canonical inventory and purchase integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) token = await loginOwner();
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('receives carton-weight purchases as sealed carton lots with kg WAC', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'carton_purchase', {
      stock_mode: 'carton_weight',
      kg_per_carton: 12,
      loose_units_per_carton: 30,
      receive: false
    });
    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `Purchase cash ${Date.now()}`,
        account_type: 'cash',
        cash_flow_permission: 'outgoing',
        opening_balance: 100
      })
      .expect(201);
    const supplierResponse = await authRequest(token)
      .post('/api/suppliers')
      .send({ name: `Carton supplier ${Date.now()}` })
      .expect(201);

    const purchaseOrderResponse = await authRequest(token)
      .post('/api/purchase-orders')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        warehouse_id: fixture.warehouse.id,
        cash_account_id: cashAccountResponse.body.data.cash_account.id,
        payment_method: 'cash',
        order_date: '2026-07-22',
        items: [{ item_id: fixture.item.id, carton_count: 2, cost_per_carton: 24 }]
      })
      .expect(201);
    const purchaseOrder = purchaseOrderResponse.body.data.purchase_order;
    const orderItem = purchaseOrder.items[0];

    expect(orderItem.item_id).toBe(fixture.item.id);
    expect(orderItem.ordered_quantity).toBe('2.0000');
    expect(orderItem.unit_cost).toBe('24.0000');

    await authRequest(token).post(`/api/purchase-orders/${purchaseOrder.id}/submit`).expect(200);
    await authRequest(token).post(`/api/purchase-orders/${purchaseOrder.id}/approve`).expect(200);

    const [supplierPayment] = await dbQuery(
      `SELECT cash_account_id
       FROM supplier_payments
       WHERE purchase_order_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [purchaseOrder.id]
    );
    expect(Number(supplierPayment.cash_account_id)).toBe(cashAccountResponse.body.data.cash_account.id);

    await authRequest(token)
      .post(`/api/purchase-orders/${purchaseOrder.id}/receipts`)
      .send({
        received_date: '2026-07-22',
        items: [{ purchase_order_item_id: orderItem.id, carton_count: 2, cost_per_carton: 24 }]
      })
      .expect(201);

    const [balance] = await dbQuery(
      `SELECT quantity_on_hand, average_cost, stock_value
       FROM item_stock_balances
       WHERE warehouse_id = ? AND item_id = ?`,
      [fixture.warehouse.id, fixture.item.id]
    );
    expect(Number(balance.quantity_on_hand)).toBe(24);
    expect(Number(balance.average_cost)).toBe(2);
    expect(Number(balance.stock_value)).toBe(48);

    const [lot] = await dbQuery(
      `SELECT received_cartons, remaining_cartons, kg_per_carton, unit_cost_per_kg
       FROM carton_stock_lots
       WHERE warehouse_id = ? AND item_id = ?`,
      [fixture.warehouse.id, fixture.item.id]
    );
    expect(Number(lot.received_cartons)).toBe(2);
    expect(Number(lot.remaining_cartons)).toBe(2);
    expect(Number(lot.kg_per_carton)).toBe(12);
    expect(Number(lot.unit_cost_per_kg)).toBe(2);
  });

  test('rejects a packaging item configured with a non-piece stock mode', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'packaging_validation', { receive: false });
    const response = await authRequest(token)
      .post('/api/items')
      .send({
        category_id: fixture.category.id,
        base_unit_id: 1,
        name: `Invalid packaging ${Date.now()}`,
        code: `INVALID_PACK_${Date.now()}`,
        item_kind: 'packaging',
        stock_mode: 'weight',
        default_cost: 1,
        reorder_level: 0
      })
      .expect(400);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'body.stock_mode' })
    ]));
  });
});
