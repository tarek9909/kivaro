import { describe, expect, it } from 'vitest';
import { createCustomersApi } from './customers.js';

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

describe('customers API module', () => {
  it('exposes CRUD, CSV export, and customer history endpoints', () => {
    const client = buildClientStub();
    const api = createCustomersApi(client);
    expect(Object.keys(api).sort()).toEqual([
      'create',
      'debts',
      'exportCsv',
      'get',
      'list',
      'payments',
      'receipts',
      'remove',
      'update'
    ]);
  });

  it('downloads CSV exports from the canonical customer export endpoint', async () => {
    const client = buildClientStub();
    const api = createCustomersApi(client);
    await api.exportCsv({
      dataset: 'invoices',
      status: 'active',
      salesman_id: 7
    });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/customers/export',
      rest: [{
        params: { dataset: 'invoices', status: 'active', salesman_id: 7 },
        responseType: 'blob'
      }]
    });
  });

  it('routes history endpoints to /customers/:id subroutes', async () => {
    const client = buildClientStub();
    const api = createCustomersApi(client);
    await api.receipts(7, { page: 1 });
    await api.debts(7, { page: 1 });
    await api.payments(7, { page: 1 });
    expect(client.calls).toEqual([
      { method: 'get', path: '/customers/7/receipts', rest: [{ params: { page: 1 } }] },
      { method: 'get', path: '/customers/7/debts', rest: [{ params: { page: 1 } }] },
      { method: 'get', path: '/customers/7/payments', rest: [{ params: { page: 1 } }] }
    ]);
  });

  it('PATCHes /customers/:id with the payload when update is called', async () => {
    const client = buildClientStub();
    const api = createCustomersApi(client);
    await api.update(7, { name: 'New name' });
    expect(client.calls[0]).toEqual({
      method: 'patch',
      path: '/customers/7',
      rest: [{ name: 'New name' }, undefined]
    });
  });
});
