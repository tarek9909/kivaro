const REPORT_PATHS = {
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

function createReport(client, path) {
  return {
    get: (params, options) => client.get(path, { ...options, params }),
    csv: (params, options) => (
      client.get(path, {
        ...options,
        params: { ...params, format: 'csv' },
        responseType: 'text'
      })
    )
  };
}

export function createReportsApi(client) {
  return Object.fromEntries(
    Object.entries(REPORT_PATHS).map(([key, path]) => [key, createReport(client, path)])
  );
}
