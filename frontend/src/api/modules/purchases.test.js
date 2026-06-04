import { describe, expect, it } from 'vitest';
import { createPurchasesApi } from './purchases.js';

function buildClientStub() {
  const calls = [];
  function record(method) {
    return (path, ...rest) => {
      calls.push({ method, path, rest });
      return Promise.resolve({ method, path, rest });
    };
  }
  return {
    calls,
    get: record('get'),
    post: record('post'),
    patch: record('patch'),
    put: record('put'),
    delete: record('delete')
  };
}

describe('purchases API module', () => {
  it('exposes only backend-supported supplier CRUD methods', () => {
    const client = buildClientStub();
    const api = createPurchasesApi(client);
    expect(Object.keys(api.suppliers).sort()).toEqual([
      'create',
      'get',
      'list',
      'remove',
      'update'
    ]);
  });

  it('exposes purchase order CRUD plus workflow actions only', () => {
    const client = buildClientStub();
    const api = createPurchasesApi(client);
    const keys = Object.keys(api.purchaseOrders).sort();
    // No 'remove' or 'replace' because the backend does not expose them.
    expect(keys).toEqual([
      'approve',
      'cancel',
      'create',
      'get',
      'list',
      'receipts',
      'receive',
      'submit',
      'update'
    ]);
  });

  it('exposes only list/create on supplier payments', () => {
    const client = buildClientStub();
    const api = createPurchasesApi(client);
    expect(Object.keys(api.supplierPayments).sort()).toEqual(['create', 'list']);
  });

  it('routes workflow actions to the correct backend endpoints', async () => {
    const client = buildClientStub();
    const api = createPurchasesApi(client);
    await api.purchaseOrders.submit(7);
    await api.purchaseOrders.approve(7);
    await api.purchaseOrders.cancel(7);
    await api.purchaseOrders.receive(7, { received_date: '2026-05-27', items: [] });
    await api.purchaseOrders.receipts(7);
    expect(client.calls).toEqual([
      { method: 'post', path: '/purchase-orders/7/submit', rest: [undefined, undefined] },
      { method: 'post', path: '/purchase-orders/7/approve', rest: [undefined, undefined] },
      { method: 'post', path: '/purchase-orders/7/cancel', rest: [undefined, undefined] },
      {
        method: 'post',
        path: '/purchase-orders/7/receipts',
        rest: [{ received_date: '2026-05-27', items: [] }, undefined]
      },
      { method: 'get', path: '/purchase-orders/7/receipts', rest: [undefined] }
    ]);
  });

  it('passes pagination params to /supplier-payments list', async () => {
    const client = buildClientStub();
    const api = createPurchasesApi(client);
    await api.supplierPayments.list({ supplier_id: 4, limit: 50 });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/supplier-payments',
      rest: [{ params: { supplier_id: 4, limit: 50 } }]
    });
  });

  it('PATCHes /purchase-orders/:id with header-only fields when update is called', async () => {
    const client = buildClientStub();
    const api = createPurchasesApi(client);
    await api.purchaseOrders.update(7, {
      supplier_id: 9,
      expected_date: '2026-06-01',
      notes: 'Adjusted'
    });
    expect(client.calls[0]).toEqual({
      method: 'patch',
      path: '/purchase-orders/7',
      rest: [
        { supplier_id: 9, expected_date: '2026-06-01', notes: 'Adjusted' },
        undefined
      ]
    });
  });
});
