const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  createLocationFixture,
  createSaleCatalogEntry,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('typed item dispatch, gifts, invoices, and returns integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) token = await loginOwner();
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('issues documents, dispatches exact item allocations, and restores a returned item', async () => {
    if (!dbReady) return;

    const inventory = await createInventoryFixture(token, 'typed_dispatch', {
      initial_stock: { quantity: 20, unit_cost: 2 }
    });
    const market = await createLocationFixture(token, 'typed_dispatch');
    const offer = await createSaleCatalogEntry(token, {
      entry_type: 'normal_piece',
      item_id: inventory.item.id,
      default_price: 5,
      is_pos_active: true
    });

    const dispatchResponse = await authRequest(token)
      .post('/api/dispatch-requests')
      .send({
        salesman_id: market.salesman.id,
        warehouse_id: inventory.warehouse.id,
        request_date: '2026-07-22'
      })
      .expect(201);
    const dispatchId = dispatchResponse.body.data.dispatch_request.id;
    const dispatchCustomerResponse = await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/customers`)
      .send({ customer_id: market.customer.id })
      .expect(201);
    const dispatchCustomer = dispatchCustomerResponse.body.data.dispatch_customer;

    const saleLineResponse = await authRequest(token)
      .post(`/api/dispatch-customers/${dispatchCustomer.id}/items`)
      .send({ sale_catalog_entry_id: offer.id, quantity: 2, line_type: 'sale' })
      .expect(201);
    const saleLine = saleLineResponse.body.data.dispatch_item;
    const giftLineResponse = await authRequest(token)
      .post(`/api/dispatch-customers/${dispatchCustomer.id}/items`)
      .send({ sale_catalog_entry_id: offer.id, quantity: 1, line_type: 'free_gift' })
      .expect(201);

    expect(saleLine.fulfillment_type).toBe('normal_piece');
    expect(Number(saleLine.line_total)).toBe(10);
    expect(giftLineResponse.body.data.dispatch_item.line_type).toBe('free_gift');
    expect(Number(giftLineResponse.body.data.dispatch_item.line_total)).toBe(0);

    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/submit`).expect(200);
    const invoicesResponse = await authRequest(token)
      .get(`/api/invoices?dispatch_request_id=${dispatchId}`)
      .expect(200);
    const invoice = invoicesResponse.body.data.invoices[0];
    expect(invoice.status).toBe('issued');

    await authRequest(token)
      .get(`/api/dispatch-requests/${dispatchId}/documents/customer-table`)
      .expect('Content-Type', /application\/pdf/)
      .expect(200);
    await authRequest(token)
      .get(`/api/dispatch-requests/${dispatchId}/documents/quantity-table`)
      .expect('Content-Type', /application\/pdf/)
      .expect(200);
    await authRequest(token)
      .get(`/api/invoices/${invoice.id}/pdf`)
      .expect('Content-Type', /application\/pdf/)
      .expect(200);

    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/approve`).expect(200);
    await authRequest(token).post(`/api/dispatch-requests/${dispatchId}/dispatch`).expect(200);

    const allocations = await dbQuery(
      `SELECT status, SUM(inventory_quantity) AS inventory_quantity
       FROM dispatch_line_allocations
       WHERE dispatch_item_id IN (?, ?)
       GROUP BY status`,
      [saleLine.id, giftLineResponse.body.data.dispatch_item.id]
    );
    expect(allocations).toEqual([
      expect.objectContaining({ status: 'dispatched', inventory_quantity: '3.0000' })
    ]);

    const [afterDispatch] = await dbQuery(
      `SELECT quantity_on_hand, quantity_reserved
       FROM item_stock_balances
       WHERE warehouse_id = ? AND item_id = ?`,
      [inventory.warehouse.id, inventory.item.id]
    );
    expect(Number(afterDispatch.quantity_on_hand)).toBe(17);
    expect(Number(afterDispatch.quantity_reserved)).toBe(0);

    await authRequest(token)
      .post(`/api/dispatch-requests/${dispatchId}/returns`)
      .send({ dispatch_item_id: saleLine.id, returned_quantity: 1, reason: 'Customer return' })
      .expect(201);

    const [afterReturn] = await dbQuery(
      `SELECT quantity_on_hand FROM item_stock_balances WHERE warehouse_id = ? AND item_id = ?`,
      [inventory.warehouse.id, inventory.item.id]
    );
    expect(Number(afterReturn.quantity_on_hand)).toBe(18);
  });
});
