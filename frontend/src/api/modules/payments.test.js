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
    expect(Object.keys(api.debts).sort()).toEqual(['applyCredit', 'get', 'list', 'pay', 'updateStatus']);
  });

  it('exposes only list/create on customer payments', () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    expect(Object.keys(api.customerPayments).sort()).toEqual(['create', 'list']);
  });

  it('exposes list on customer credits', () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    expect(Object.keys(api.customerCredits).sort()).toEqual(['list']);
  });

  it('exposes list/get/print/printPdf on receipts (no update or delete)', () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    expect(Object.keys(api.receipts).sort()).toEqual(['get', 'list', 'print', 'printPdf']);
  });

  it('routes debt actions to the correct endpoints', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    await api.debts.list({ status: 'pending' });
    await api.debts.get(11);
    await api.debts.pay(11, { payment_date: '2026-05-27', amount: 50, payment_method: 'cash' });
    await api.debts.applyCredit(11, {});
    await api.debts.updateStatus(11, { status: 'paid' });
    expect(client.calls).toEqual([
      { method: 'get', path: '/customer-debts', rest: [{ params: { status: 'pending' } }] },
      { method: 'get', path: '/customer-debts/11', rest: [undefined] },
      {
        method: 'post',
        path: '/customer-debts/11/payments',
        rest: [
          { payment_date: '2026-05-27', amount: 50, payment_method: 'cash' },
          undefined
        ]
      },
      {
        method: 'post',
        path: '/customer-debts/11/apply-credit',
        rest: [{}, undefined]
      },
      {
        method: 'patch',
        path: '/customer-debts/11/status',
        rest: [{ status: 'paid' }, undefined]
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

  it('POSTs a customer payment to /customer-payments', async () => {
    const client = buildClientStub();
    const api = createPaymentsApi(client);
    await api.customerPayments.create({
      customer_id: 12,
      payment_date: '2026-05-27',
      amount: 100,
      payment_method: 'cash'
    });
    expect(client.calls[0]).toEqual({
      method: 'post',
      path: '/customer-payments',
      rest: [
        {
          customer_id: 12,
          payment_date: '2026-05-27',
          amount: 100,
          payment_method: 'cash'
        },
        undefined
      ]
    });
  });
});
