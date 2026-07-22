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

const EXPECTED_PATHS = {
  commissions: '/reports/commissions',
  currentStock: '/reports/current-stock',
  customerBalances: '/reports/customer-balances',
  debts: '/reports/debts',
  dispatchSummary: '/reports/dispatch-summary',
  gifts: '/reports/gifts',
  invoices: '/reports/invoices',
  normalStock: '/reports/normal-stock',
  packagingOperations: '/reports/packaging-operations',
  packagingShortages: '/reports/packaging-shortages',
  packagingStock: '/reports/packaging-stock',
  posOrders: '/reports/pos-orders',
  profitLoss: '/reports/profit-loss',
  purchases: '/reports/purchases',
  readyStock: '/reports/ready-stock',
  salesmanPerformance: '/reports/salesman-performance',
  salesmanTargetProgress: '/reports/salesman-target-progress',
  sales: '/reports/sales',
  stockMovements: '/reports/stock-movements'
};

describe('reports API module', () => {
  it('exposes get/csv for every canonical backend report', () => {
    const api = createReportsApi(buildClientStub());

    expect(Object.keys(api).sort()).toEqual(Object.keys(EXPECTED_PATHS).sort());
    for (const report of Object.values(api)) {
      expect(Object.keys(report).sort()).toEqual(['csv', 'get']);
    }
  });

  it('routes every report get() request with the supplied filters', async () => {
    const client = buildClientStub();
    const api = createReportsApi(client);
    for (const key of Object.keys(EXPECTED_PATHS)) {
      await api[key].get({ page: 2, limit: 50, date_from: '2026-01-01' });
    }

    expect(client.calls).toEqual(
      Object.entries(EXPECTED_PATHS).map(([, path]) => ({
        method: 'get',
        path,
        rest: [{ params: { page: 2, limit: 50, date_from: '2026-01-01' } }]
      }))
    );
  });

  it('adds format=csv and responseType=text for an export', async () => {
    const client = buildClientStub();
    const api = createReportsApi(client);

    await api.gifts.csv({ salesman_id: 4, date_from: '2026-01-01' });

    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/reports/gifts',
      rest: [{
        params: { salesman_id: 4, date_from: '2026-01-01', format: 'csv' },
        responseType: 'text'
      }]
    });
  });
});
