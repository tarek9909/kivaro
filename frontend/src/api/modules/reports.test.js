import { describe, expect, it } from 'vitest';
import { createReportsApi } from './reports.js';

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

const EXPECTED_KEYS = [
  'commissions',
  'currentStock',
  'customerBalances',
  'debts',
  'dispatchSummary',
  'profitLoss',
  'purchases',
  'packagingAssignments',
  'packagingShortages',
  'salesmanTargetProgress',
  'sales',
  'stockMovements'
];

const EXPECTED_PATHS = {
  commissions: '/reports/commissions',
  currentStock: '/reports/current-stock',
  customerBalances: '/reports/customer-balances',
  debts: '/reports/debts',
  dispatchSummary: '/reports/dispatch-summary',
  profitLoss: '/reports/profit-loss',
  purchases: '/reports/purchases',
  packagingAssignments: '/reports/packaging-assignments',
  packagingShortages: '/reports/packaging-shortages',
  salesmanTargetProgress: '/reports/salesman-target-progress',
  sales: '/reports/sales',
  stockMovements: '/reports/stock-movements'
};

describe('reports API module', () => {
  it('exposes get/csv for every backend report', () => {
    const client = buildClientStub();
    const api = createReportsApi(client);
    const keys = Object.keys(api).sort();
    expect(keys).toEqual(EXPECTED_KEYS.slice().sort());
    for (const key of keys) {
      expect(Object.keys(api[key]).sort()).toEqual(['csv', 'get']);
    }
  });

  it('routes get() to the correct path with the supplied params', async () => {
    const client = buildClientStub();
    const api = createReportsApi(client);
    for (const key of EXPECTED_KEYS) {
      await api[key].get({ page: 2, limit: 50, search: 'x' });
    }
    expect(client.calls).toEqual(
      EXPECTED_KEYS.map((key) => ({
        method: 'get',
        path: EXPECTED_PATHS[key],
        rest: [{ params: { page: 2, limit: 50, search: 'x' } }]
      }))
    );
  });

  it('appends format=csv and responseType=text on csv()', async () => {
    const client = buildClientStub();
    const api = createReportsApi(client);
    await api.sales.csv({ status: 'completed', date_from: '2026-01-01' });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/reports/sales',
      rest: [
        {
          params: {
            status: 'completed',
            date_from: '2026-01-01',
            format: 'csv'
          },
          responseType: 'text'
        }
      ]
    });
  });

  it('handles csv() without params', async () => {
    const client = buildClientStub();
    const api = createReportsApi(client);
    await api.profitLoss.csv();
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/reports/profit-loss',
      rest: [{ params: { format: 'csv' }, responseType: 'text' }]
    });
  });
});
