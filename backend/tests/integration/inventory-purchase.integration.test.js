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

describe('inventory and purchase integration', () => {
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

  test('purchase approval records a supplier payment and partial receiving creates stock movements', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'inventory_purchase');
    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `Purchase Cash ${Date.now()}`,
        account_type: 'cash',
        opening_balance: 100
      })
      .expect(201);
    const cashAccountId = cashAccountResponse.body.data.cash_account.id;

    const supplierResponse = await authRequest(token)
      .post('/api/suppliers')
      .send({ name: 'Integration Supplier' })
      .expect(201);

    const poResponse = await authRequest(token)
      .post('/api/purchase-orders')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        warehouse_id: fixture.warehouse.id,
        cash_account_id: cashAccountId,
        payment_method: 'cash',
        order_date: '2026-05-26',
        items: [
          {
            item_variant_id: fixture.variant.id,
            ordered_quantity: 5,
            unit_cost: 3
          }
        ]
      })
      .expect(201);

    const purchaseOrder = poResponse.body.data.purchase_order;
    const purchaseOrderItem = purchaseOrder.items[0];

    await authRequest(token)
      .post('/api/supplier-payments')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        purchase_order_id: purchaseOrder.id,
        payment_date: '2026-05-26',
        amount: 1,
        payment_method: 'cash',
        cash_account_id: cashAccountId
      })
      .expect(409);

    const cancelledPoResponse = await authRequest(token)
      .post('/api/purchase-orders')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        warehouse_id: fixture.warehouse.id,
        cash_account_id: cashAccountId,
        payment_method: 'cash',
        order_date: '2026-05-26',
        items: [
          {
            item_variant_id: fixture.variant.id,
            ordered_quantity: 1,
            unit_cost: 3
          }
        ]
      })
      .expect(201);
    await authRequest(token)
      .post(`/api/purchase-orders/${cancelledPoResponse.body.data.purchase_order.id}/cancel`)
      .expect(200);
    await authRequest(token)
      .post('/api/supplier-payments')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        purchase_order_id: cancelledPoResponse.body.data.purchase_order.id,
        payment_date: '2026-05-26',
        amount: 1,
        payment_method: 'cash',
        cash_account_id: cashAccountId
      })
      .expect(409);

    await authRequest(token).post(`/api/purchase-orders/${purchaseOrder.id}/submit`).expect(200);
    const approvedResponse = await authRequest(token)
      .post(`/api/purchase-orders/${purchaseOrder.id}/approve`)
      .expect(200);
    expect(Number(approvedResponse.body.data.purchase_order.amount_paid)).toBe(15);
    expect(Number(approvedResponse.body.data.purchase_order.outstanding_amount)).toBe(0);

    const automaticPaymentsResponse = await authRequest(token)
      .get(`/api/supplier-payments?purchase_order_id=${purchaseOrder.id}`)
      .expect(200);
    expect(automaticPaymentsResponse.body.data.supplier_payments).toHaveLength(1);
    expect(Number(automaticPaymentsResponse.body.data.supplier_payments[0].amount)).toBe(15);

    await authRequest(token)
      .post(`/api/purchase-orders/${purchaseOrder.id}/receipts`)
      .send({
        received_date: '2026-05-26',
        items: [
          {
            purchase_order_item_id: purchaseOrderItem.id,
            received_quantity: 2,
            unit_cost: 3
          }
        ]
      })
      .expect(201);

    const receiptsResponse = await authRequest(token)
      .get(`/api/purchase-orders/${purchaseOrder.id}/receipts`)
      .expect(200);

    expect(receiptsResponse.body.data.purchase_receipts).toHaveLength(1);
    expect(receiptsResponse.body.data.purchase_order).toBeUndefined();

    const closedResponse = await authRequest(token)
      .post(`/api/purchase-orders/${purchaseOrder.id}/cancel`)
      .expect(200);
    expect(closedResponse.body.data.purchase_order.status).toBe('closed');
    expect(Number(closedResponse.body.data.purchase_order.payable_amount)).toBe(6);
    expect(Number(closedResponse.body.data.purchase_order.outstanding_amount)).toBe(0);

    await authRequest(token)
      .post('/api/supplier-payments')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        purchase_order_id: purchaseOrder.id,
        payment_date: '2026-05-26',
        amount: 7,
        payment_method: 'cash',
        cash_account_id: cashAccountId
      })
      .expect(409);

    await authRequest(token)
      .post('/api/supplier-payments')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        purchase_order_id: purchaseOrder.id,
        payment_date: '2026-05-26',
        amount: 6,
        payment_method: 'cash',
        cash_account_id: cashAccountId
      })
      .expect(409);

    const paidClosedResponse = await authRequest(token)
      .get(`/api/purchase-orders/${purchaseOrder.id}`)
      .expect(200);
    expect(paidClosedResponse.body.data.purchase_order.status).toBe('closed');
    expect(Number(paidClosedResponse.body.data.purchase_order.outstanding_amount)).toBe(0);

    const movements = await dbQuery(
      `SELECT movement_type, quantity_change
       FROM stock_movements
       WHERE warehouse_id = ? AND item_variant_id = ?
       ORDER BY id ASC`,
      [fixture.warehouse.id, fixture.variant.id]
    );

    expect(movements.map((movement) => movement.movement_type)).toEqual(
      expect.arrayContaining(['purchase_receive'])
    );
  });

  test('non-stocked variants are rejected from stock-moving flows', async () => {
    if (!dbReady) return;

    const fixture = await createInventoryFixture(token, 'non_stocked');
    const market = await createLocationFixture(token, 'non_stocked');
    const itemResponse = await authRequest(token)
      .post('/api/items')
      .send({
        category_id: 1,
        base_unit_id: 1,
        name: `Non Stocked Item ${Date.now()}`,
        code: `NS_${Date.now()}`,
        item_type: 'service',
        tracking_type: 'non_stocked',
        default_cost: 0,
        default_selling_price: 5,
        reorder_level: 0
      })
      .expect(201);
    const variantResponse = await authRequest(token)
      .post('/api/item-variants')
      .send({
        item_id: itemResponse.body.data.item.id,
        variant_name: 'Service',
        sku: `NS_SKU_${Date.now()}`,
        cost: 0,
        selling_price: 5
      })
      .expect(201);
    const variantId = variantResponse.body.data.item_variant.id;

    const listedVariantsResponse = await authRequest(token)
      .get('/api/item-variants?tracking_type=stocked&limit=1000')
      .expect(200);
    expect(listedVariantsResponse.body.data.item_variants.some((variant) => Number(variant.id) === Number(variantId))).toBe(false);

    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        warehouse_id: fixture.warehouse.id,
        item_variant_id: variantId,
        quantity_change: 1,
        unit_cost: 0,
        reason: 'Should not move stock'
      })
      .expect(400);

    const supplierResponse = await authRequest(token)
      .post('/api/suppliers')
      .send({ name: `Non Stocked Supplier ${Date.now()}` })
      .expect(201);
    const cashAccountResponse = await authRequest(token)
      .post('/api/cash-accounts')
      .send({
        account_name: `Non Stocked Purchase Cash ${Date.now()}`,
        account_type: 'cash',
        opening_balance: 100
      })
      .expect(201);

    await authRequest(token)
      .post('/api/purchase-orders')
      .send({
        supplier_id: supplierResponse.body.data.supplier.id,
        warehouse_id: fixture.warehouse.id,
        cash_account_id: cashAccountResponse.body.data.cash_account.id,
        payment_method: 'cash',
        order_date: '2026-05-26',
        items: [
          {
            item_variant_id: variantId,
            ordered_quantity: 1,
            unit_cost: 1
          }
        ]
      })
      .expect(400);

    const dispatchResponse = await authRequest(token)
      .post('/api/dispatch-requests')
      .send({
        salesman_id: market.salesman.id,
        warehouse_id: fixture.warehouse.id,
        request_date: '2026-05-26'
      })
      .expect(201);
    const dispatchCustomerResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchResponse.body.data.dispatch_request.id}/customers`)
      .send({ customer_id: market.customer.id })
      .expect(201);

    await authRequest(token)
      .post(`/api/dispatch-customers/${dispatchCustomerResponse.body.data.dispatch_customer.id}/items`)
      .send({
        item_variant_id: variantId,
        quantity: 1,
        unit_price: 5,
        unit_cost: 0
      })
      .expect(400);
  });
});
