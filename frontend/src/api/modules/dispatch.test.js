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
  it('exposes only backend-supported request methods', () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    // No 'remove' or 'replace' because the backend does not expose them.
    expect(Object.keys(api.requests).sort()).toEqual([
      'addCustomer',
      'approve',
      'cancel',
      'create',
      'createReturn',
      'createSettlement',
      'dispatchStock',
      'get',
      'list',
      'printCustomerReceipts',
      'printCustomerReceiptsPdf',
      'printSummary',
      'printSummaryPdf',
      'settlements',
      'submit',
      'update'
    ]);
  });

  it('exposes only addItem on dispatch customers and supported settlement helpers', () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    expect(Object.keys(api.customers).sort()).toEqual(['addItem']);
    expect(Object.keys(api.settlements).sort()).toEqual(['addCustomer', 'cancel', 'complete', 'get']);
  });

  it('lists, creates, gets, and updates dispatch requests via the correct paths', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.list({ page: 2, status: 'draft' });
    await api.requests.create({ salesman_id: 1, warehouse_id: 2, request_date: '2026-05-27' });
    await api.requests.get(11);
    await api.requests.update(11, { request_date: '2026-05-28', notes: 'edit' });
    expect(client.calls).toEqual([
      {
        method: 'get',
        path: '/dispatch-requests',
        rest: [{ params: { page: 2, status: 'draft' } }]
      },
      {
        method: 'post',
        path: '/dispatch-requests',
        rest: [{ salesman_id: 1, warehouse_id: 2, request_date: '2026-05-27' }, undefined]
      },
      { method: 'get', path: '/dispatch-requests/11', rest: [undefined] },
      {
        method: 'patch',
        path: '/dispatch-requests/11',
        rest: [{ request_date: '2026-05-28', notes: 'edit' }, undefined]
      }
    ]);
  });

  it('routes lifecycle actions to the correct backend endpoints', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.submit(7);
    await api.requests.approve(7);
    await api.requests.dispatchStock(7);
    await api.requests.cancel(7);
    expect(client.calls).toEqual([
      { method: 'post', path: '/dispatch-requests/7/submit', rest: [undefined, undefined] },
      { method: 'post', path: '/dispatch-requests/7/approve', rest: [undefined, undefined] },
      { method: 'post', path: '/dispatch-requests/7/dispatch', rest: [undefined, undefined] },
      { method: 'post', path: '/dispatch-requests/7/cancel', rest: [undefined, undefined] }
    ]);
  });

  it('posts customer/item/return/settlement payloads to the right endpoints', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.addCustomer(7, { customer_id: 12 });
    await api.customers.addItem(33, {
      item_variant_id: 4,
      quantity: 2,
      unit_price: 5
    });
    await api.requests.createReturn(7, {
      dispatch_item_id: 22,
      returned_quantity: 1
    });
    await api.requests.createSettlement(7, { settlement_date: '2026-05-30' });
    await api.settlements.get(91);
    await api.settlements.addCustomer(91, {
      dispatch_customer_id: 100,
      collected_amount: 250
    });
    await api.settlements.complete(91, { payment_method: 'cash' });
    await api.settlements.cancel(92);
    expect(client.calls).toEqual([
      {
        method: 'post',
        path: '/dispatch-requests/7/customers',
        rest: [{ customer_id: 12 }, undefined]
      },
      {
        method: 'post',
        path: '/dispatch-customers/33/items',
        rest: [{ item_variant_id: 4, quantity: 2, unit_price: 5 }, undefined]
      },
      {
        method: 'post',
        path: '/dispatch-requests/7/returns',
        rest: [{ dispatch_item_id: 22, returned_quantity: 1 }, undefined]
      },
      {
        method: 'post',
        path: '/dispatch-requests/7/settlements',
        rest: [{ settlement_date: '2026-05-30' }, undefined]
      },
      {
        method: 'get',
        path: '/dispatch-settlements/91',
        rest: [undefined]
      },
      {
        method: 'post',
        path: '/dispatch-settlements/91/customers',
        rest: [{ dispatch_customer_id: 100, collected_amount: 250 }, undefined]
      },
      {
        method: 'post',
        path: '/dispatch-settlements/91/complete',
        rest: [{ payment_method: 'cash' }, undefined]
      },
      {
        method: 'post',
        path: '/dispatch-settlements/92/cancel',
        rest: [undefined, undefined]
      }
    ]);
  });

  it('GETs the printable summary as JSON by default', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.printSummary(7);
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/dispatch-requests/7/print-summary',
      rest: [{ params: undefined }]
    });
  });

  it('requests the printable summary PDF as a blob', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.printSummaryPdf(7);
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/dispatch-requests/7/print-summary',
      rest: [{ params: { format: 'pdf' }, responseType: 'blob' }]
    });
  });

  it('requests the printable customer receipts PDF as a blob', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.printCustomerReceiptsPdf(7);
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/dispatch-requests/7/print-customer-receipts',
      rest: [{ params: { format: 'pdf' }, responseType: 'blob' }]
    });
  });

  it('GETs the in-session settlements helper without assuming a list/detail shape', async () => {
    const client = buildClientStub();
    const api = createDispatchApi(client);
    await api.requests.settlements(7);
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/dispatch-requests/7/settlements',
      rest: [undefined]
    });
  });
});
