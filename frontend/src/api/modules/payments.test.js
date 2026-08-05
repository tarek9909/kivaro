import { describe, expect, it } from 'vitest';
import { createPaymentsApi } from './payments.js';

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

describe('payments API module', () => {
  it('exposes only the supported debt methods', () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    expect(Object.keys(api.debts).sort()).toEqual(['applyCredit', 'csv', 'get', 'list', 'pay', 'printPdf']);
  });

  it('exposes payment creation, history, and printing', () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    expect(Object.keys(api.customerPayments).sort()).toEqual(['create', 'csv', 'list', 'print', 'printPdf']);
  });

  it('posts a direct customer payment to the supported endpoint', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);

    await api.customerPayments.create({ customer_id: 8, amount: 25, cash_account_id: 3 });

    expect(client.calls).toEqual([{
      method: 'post',
      path: '/customer-payments',
      rest: [{ customer_id: 8, amount: 25, cash_account_id: 3 }, undefined]
    }]);
  });

  it('exposes list on customer credits', () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    expect(Object.keys(api.customerCredits).sort()).toEqual(['list']);
  });

  it('exposes list/get/print/printPdf on receipts (no update or delete)', () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    expect(Object.keys(api.receipts).sort()).toEqual(['csv', 'get', 'list', 'print', 'printPdf']);
  });

  it('routes debt actions to the correct endpoints', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    await api.debts.list({ status: 'pending' });
    await api.debts.get(11);
    await api.debts.pay(11, { amount: 50, cash_account_id: 4 });
    expect(client.calls).toEqual([
      { method: 'get', path: '/customer-debts', rest: [{ params: { status: 'pending' } }] },
      { method: 'get', path: '/customer-debts/11', rest: [undefined] },
      {
        method: 'post',
        path: '/customer-debts/11/payments',
        rest: [
          { amount: 50, cash_account_id: 4 },
          undefined
        ]
      }
    ]);
  });

  it('GETs receipts list with filter params', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    await api.receipts.list({ customer_id: 3 });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/customer-receipts',
      rest: [{ params: { customer_id: 3 } }]
    });
  });

  it('GETs customer credits list with filter params', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    await api.customerCredits.list({ customer_id: 3 });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/customer-credits',
      rest: [{ params: { customer_id: 3 } }]
    });
  });

  it('requests the printable receipt JSON by default', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    await api.receipts.print(7);
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/customer-receipts/7/print',
      rest: [{ params: undefined }]
    });
  });

  it('requests the printable receipt PDF as a blob', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    await api.receipts.printPdf(7);
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/customer-receipts/7/print',
      rest: [{ params: { format: 'pdf' }, responseType: 'blob' }]
    });
  });

});
