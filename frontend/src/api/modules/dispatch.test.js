import { describe, expect, it } from 'vitest';
import { createDispatchApi } from './dispatch.js';

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

describe('dispatch API module', () => {
  it('exposes the item-based dispatch, document, invoice, and settlement contracts', () => {
    const api = createDispatchApi(buildClientStub());
    expect(Object.keys(api.requests).sort()).toEqual([
      'addCustomer', 'approve', 'cancel', 'create', 'createCloseout', 'createFromPos',
      'createReturn', 'dispatchStock', 'get', 'list', 'rework', 'settlements', 'submit', 'update'
    ]);
    expect(Object.keys(api.customers)).toEqual(['addItem']);
    expect(Object.keys(api.items).sort()).toEqual(['remove', 'update']);
    expect(Object.keys(api.documents).sort()).toEqual(['customerTablePdf', 'quantityTablePdf']);
    expect(Object.keys(api.invoices).sort()).toEqual(['get', 'list', 'pdf']);
    expect(Object.keys(api.settlements).sort()).toEqual(['get', 'post']);
  });

  it('uses catalog-backed dispatch line and lifecycle endpoints', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.create({ salesman_id: 1, warehouse_id: 2, request_date: '2026-07-22' });
    await api.requests.addCustomer(7, { customer_id: 12 });
    await api.customers.addItem(33, {
      sale_catalog_entry_id: 4,
      quantity: 2,
      line_type: 'free_gift'
    });
    await api.requests.submit(7);
    await api.requests.rework(7, { reason: 'Correct price' });
    await api.requests.approve(7);
    await api.requests.dispatchStock(7);
    await api.requests.createCloseout(7, { settlement_date: '2026-07-22', customers: [] });
    await api.items.update(33, { quantity: 3, unit_price: 4 });
    await api.items.remove(33);
    await api.settlements.post(91, { cash_account_id: 3 });
    expect(client.calls).toEqual([
      { method: 'post', path: '/dispatch-requests', rest: [{ salesman_id: 1, warehouse_id: 2, request_date: '2026-07-22' }, undefined] },
      { method: 'post', path: '/dispatch-requests/7/customers', rest: [{ customer_id: 12 }, undefined] },
      { method: 'post', path: '/dispatch-customers/33/items', rest: [{ sale_catalog_entry_id: 4, quantity: 2, line_type: 'free_gift' }, undefined] },
      { method: 'post', path: '/dispatch-requests/7/submit', rest: [undefined, undefined] },
      { method: 'post', path: '/dispatch-requests/7/rework', rest: [{ reason: 'Correct price' }, undefined] },
      { method: 'post', path: '/dispatch-requests/7/approve', rest: [undefined, undefined] },
      { method: 'post', path: '/dispatch-requests/7/dispatch', rest: [undefined, undefined] },
      { method: 'post', path: '/dispatch-requests/7/closeout', rest: [{ settlement_date: '2026-07-22', customers: [] }, undefined] },
      { method: 'patch', path: '/dispatch-items/33', rest: [{ quantity: 3, unit_price: 4 }, undefined] },
      { method: 'delete', path: '/dispatch-items/33', rest: [undefined] },
      { method: 'post', path: '/dispatch-settlements/91/post', rest: [{ cash_account_id: 3 }, undefined] }
    ]);
  });

  it('downloads the required documents and invoices as blobs', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.documents.customerTablePdf(7);
    await api.documents.quantityTablePdf(7);
    await api.invoices.pdf(14);
    expect(client.calls).toEqual([
      { method: 'get', path: '/dispatch-requests/7/documents/customer-table', rest: [{ responseType: 'blob' }] },
      { method: 'get', path: '/dispatch-requests/7/documents/quantity-table', rest: [{ responseType: 'blob' }] },
      { method: 'get', path: '/invoices/14/pdf', rest: [{ responseType: 'blob' }] }
    ]);
  });
});
