const REPORT_PATHS = {
  cashReconciliation: '/reports/cash-reconciliation',
  commissions: '/reports/commissions',
  currentStock: '/reports/current-stock',
  customerBalances: '/reports/customer-balances',
  customerProfitability: '/reports/customer-profitability',
  debts: '/reports/debts',
  deliveryCloseouts: '/reports/delivery-closeouts',
  discounts: '/reports/discounts',
  dispatchSummary: '/reports/dispatch-summary',
  gifts: '/reports/gifts',
  invoices: '/reports/invoices',
  inventoryAging: '/reports/inventory-aging',
  orderPipeline: '/reports/order-pipeline',
  normalStock: '/reports/normal-stock',
  packagingOperations: '/reports/packaging-operations',
  packagingShortages: '/reports/packaging-shortages',
  packagingStock: '/reports/packaging-stock',
  productProfitability: '/reports/product-profitability',
  profitLoss: '/reports/profit-loss',
  purchases: '/reports/purchases',
  readyStock: '/reports/ready-stock',
  salesmanPerformance: '/reports/salesman-performance',
  salesmanTargetProgress: '/reports/salesman-target-progress',
  sales: '/reports/sales',
  stockMovements: '/reports/stock-movements',
  territoryProfitability: '/reports/territory-profitability',
  returns: '/reports/returns',
  vatSummary: '/reports/vat-summary'
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
