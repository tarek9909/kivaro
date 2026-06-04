import { describe, expect, it } from 'vitest';
import { createAccountingApi } from './accounting.js';

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

describe('accounting API module', () => {
  it('exposes only backend-supported expense category methods', () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    expect(Object.keys(api.expenseCategories).sort()).toEqual([
      'create',
      'list',
      'remove',
      'update'
    ]);
  });

  it('exposes only backend-supported expense methods', () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    expect(Object.keys(api.expenses).sort()).toEqual([
      'create',
      'get',
      'list',
      'remove',
      'update'
    ]);
  });

  it('exposes only list/create/update on cash accounts (no remove)', () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    expect(Object.keys(api.cashAccounts).sort()).toEqual(['create', 'list', 'update']);
  });

  it('exposes only list on financial transactions', () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    expect(Object.keys(api.financialTransactions).sort()).toEqual(['list']);
  });

  it('exposes only list/get/close on salesman balances', () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    expect(Object.keys(api.salesmanBalances).sort()).toEqual(['close', 'get', 'list']);
  });

  it('routes the salesman balance close action to the right endpoint', async () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    await api.salesmanBalances.close(7);
    expect(client.calls[0]).toEqual({
      method: 'post',
      path: '/salesman-balances/7/close',
      rest: [undefined, undefined]
    });
  });

  it('routes financial transaction list params to the query string', async () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    await api.financialTransactions.list({
      cash_account_id: 4,
      direction: 'in'
    });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/financial-transactions',
      rest: [{ params: { cash_account_id: 4, direction: 'in' } }]
    });
  });

  it('PATCHes /cash-accounts/:id with header fields when update is called', async () => {
    const client = buildClientStub();
    const api = createAccountingApi(client);
    await api.cashAccounts.update(11, { account_name: 'Main wallet', status: 'inactive' });
    expect(client.calls[0]).toEqual({
      method: 'patch',
      path: '/cash-accounts/11',
      rest: [{ account_name: 'Main wallet', status: 'inactive' }, undefined]
    });
  });
});
