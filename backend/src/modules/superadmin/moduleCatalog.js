const MODULE_CATALOG = [
  { key: 'dashboard', label: 'Dashboard', type: 'module', routePrefixes: ['/dashboard'] },
  { key: 'inventory', label: 'Inventory', type: 'module', routePrefixes: ['/item-categories', '/units', '/items', '/item-variants', '/warehouses', '/stock-balances', '/stock-movements', '/stock-adjustments', '/packaging-groups', '/packaging-group-components', '/packaging-assignments'] },
  { key: 'inventory.items', parentKey: 'inventory', label: 'Items', type: 'feature', routePrefixes: ['/items'] },
  { key: 'inventory.packaging', parentKey: 'inventory', label: 'Packaging', type: 'feature', routePrefixes: ['/packaging-groups', '/packaging-group-components', '/packaging-assignments'] },
  { key: 'inventory.variants', parentKey: 'inventory', label: 'Variants', type: 'feature', routePrefixes: ['/item-variants'] },
  { key: 'inventory.categories', parentKey: 'inventory', label: 'Categories', type: 'feature', routePrefixes: ['/item-categories'] },
  { key: 'inventory.units', parentKey: 'inventory', label: 'Units', type: 'feature', routePrefixes: ['/units'] },
  { key: 'inventory.warehouses', parentKey: 'inventory', label: 'Warehouses', type: 'feature', routePrefixes: ['/warehouses'] },
  { key: 'inventory.balances', parentKey: 'inventory', label: 'Stock balances', type: 'feature', routePrefixes: ['/stock-balances'] },
  { key: 'inventory.movements', parentKey: 'inventory', label: 'Stock movements', type: 'feature', routePrefixes: ['/stock-movements'] },
  { key: 'inventory.adjustments', parentKey: 'inventory', label: 'Adjustments', type: 'feature', routePrefixes: ['/stock-adjustments'] },
  { key: 'purchases', label: 'Purchases', type: 'module', routePrefixes: ['/suppliers', '/purchase-orders', '/supplier-payments'] },
  { key: 'purchases.orders', parentKey: 'purchases', label: 'Purchase orders', type: 'feature', routePrefixes: ['/purchase-orders'] },
  { key: 'purchases.suppliers', parentKey: 'purchases', label: 'Suppliers', type: 'feature', routePrefixes: ['/suppliers'] },
  { key: 'purchases.payments', parentKey: 'purchases', label: 'Supplier payments', type: 'feature', routePrefixes: ['/supplier-payments'] },
  { key: 'production', label: 'Production', type: 'module', routePrefixes: ['/packaging-configurations', '/packaging-configuration-components', '/production-batches', '/product-cost-history'] },
  { key: 'production.configurations', parentKey: 'production', label: 'Configurations', type: 'feature', routePrefixes: ['/packaging-configurations', '/packaging-configuration-components'] },
  { key: 'production.batches', parentKey: 'production', label: 'Batches', type: 'feature', routePrefixes: ['/production-batches'] },
  { key: 'production.cost-history', parentKey: 'production', label: 'Cost history', type: 'feature', routePrefixes: ['/product-cost-history'] },
  { key: 'locations', label: 'Locations', type: 'module', routePrefixes: ['/locations', '/sublocations', '/salesmen', '/location-targets', '/sublocation-targets'] },
  { key: 'locations.locations', parentKey: 'locations', label: 'Locations', type: 'feature', routePrefixes: ['/locations'] },
  { key: 'locations.sublocations', parentKey: 'locations', label: 'Sublocations', type: 'feature', routePrefixes: ['/sublocations'] },
  { key: 'locations.salesmen', parentKey: 'locations', label: 'Salesmen', type: 'feature', routePrefixes: ['/salesmen'] },
  { key: 'locations.targets', parentKey: 'locations', label: 'Targets', type: 'feature', routePrefixes: ['/location-targets', '/sublocation-targets'] },
  { key: 'customers', label: 'Customers', type: 'module', routePrefixes: ['/customers'] },
  { key: 'dispatch', label: 'Dispatch', type: 'module', routePrefixes: ['/dispatch-requests', '/dispatch-customers', '/dispatch-settlements'] },
  { key: 'dispatch.requests', parentKey: 'dispatch', label: 'Dispatch requests', type: 'feature', routePrefixes: ['/dispatch-requests', '/dispatch-customers', '/dispatch-settlements'] },
  { key: 'accounting', label: 'Accounting', type: 'module', routePrefixes: ['/expense-categories', '/expenses', '/cash-accounts', '/financial-transactions', '/salesman-balances'] },
  { key: 'accounting.expense-categories', parentKey: 'accounting', label: 'Expense categories', type: 'feature', routePrefixes: ['/expense-categories'] },
  { key: 'accounting.expenses', parentKey: 'accounting', label: 'Expenses', type: 'feature', routePrefixes: ['/expenses'] },
  { key: 'accounting.cash-accounts', parentKey: 'accounting', label: 'Cash accounts', type: 'feature', routePrefixes: ['/cash-accounts'] },
  { key: 'accounting.financial-transactions', parentKey: 'accounting', label: 'Financial transactions', type: 'feature', routePrefixes: ['/financial-transactions'] },
  { key: 'accounting.salesman-balances', parentKey: 'accounting', label: 'Salesman balances', type: 'feature', routePrefixes: ['/salesman-balances'] },
  { key: 'payments', label: 'Payments', type: 'module', routePrefixes: ['/customer-debts', '/customer-payments', '/customer-credits', '/customer-receipts'] },
  { key: 'payments.debts', parentKey: 'payments', label: 'Customer debts', type: 'feature', routePrefixes: ['/customer-debts'] },
  { key: 'payments.customer-payments', parentKey: 'payments', label: 'Customer payments', type: 'feature', routePrefixes: ['/customer-payments'] },
  { key: 'payments.customer-credits', parentKey: 'payments', label: 'Customer credits', type: 'feature', routePrefixes: ['/customer-credits'] },
  { key: 'payments.receipts', parentKey: 'payments', label: 'Receipts', type: 'feature', routePrefixes: ['/customer-receipts'] },
  { key: 'commissions', label: 'Commissions', type: 'module', routePrefixes: ['/commission-rules', '/commissions'] },
  { key: 'commissions.rules', parentKey: 'commissions', label: 'Rules', type: 'feature', routePrefixes: ['/commission-rules'] },
  { key: 'commissions.calculations', parentKey: 'commissions', label: 'Calculations', type: 'feature', routePrefixes: ['/commissions'] },
  { key: 'reports', label: 'Reports', type: 'module', routePrefixes: ['/reports'] },
  { key: 'reports.current-stock', parentKey: 'reports', label: 'Current stock', type: 'feature', routePrefixes: ['/reports/current-stock'] },
  { key: 'reports.customer-balances', parentKey: 'reports', label: 'Customer balances', type: 'feature', routePrefixes: ['/reports/customer-balances'] },
  { key: 'reports.salesman-target-progress', parentKey: 'reports', label: 'Salesman target progress', type: 'feature', routePrefixes: ['/reports/salesman-target-progress'] },
  { key: 'reports.dispatch-summary', parentKey: 'reports', label: 'Dispatch summary', type: 'feature', routePrefixes: ['/reports/dispatch-summary'] },
  { key: 'reports.sales', parentKey: 'reports', label: 'Sales', type: 'feature', routePrefixes: ['/reports/sales'] },
  { key: 'reports.debts', parentKey: 'reports', label: 'Debts', type: 'feature', routePrefixes: ['/reports/debts'] },
  { key: 'reports.purchases', parentKey: 'reports', label: 'Purchases', type: 'feature', routePrefixes: ['/reports/purchases'] },
  { key: 'reports.packaging-assignments', parentKey: 'reports', label: 'Packaging assignments', type: 'feature', routePrefixes: ['/reports/packaging-assignments'] },
  { key: 'reports.packaging-shortages', parentKey: 'reports', label: 'Packaging shortages', type: 'feature', routePrefixes: ['/reports/packaging-shortages'] },
  { key: 'reports.stock-movements', parentKey: 'reports', label: 'Stock movements', type: 'feature', routePrefixes: ['/reports/stock-movements'] },
  { key: 'reports.profit-loss', parentKey: 'reports', label: 'Profit and loss', type: 'feature', routePrefixes: ['/reports/profit-loss'] },
  { key: 'reports.commissions', parentKey: 'reports', label: 'Commissions', type: 'feature', routePrefixes: ['/reports/commissions'] },
  { key: 'audit_logs', label: 'Audit Logs', type: 'module', routePrefixes: ['/audit-logs'] },
  { key: 'notifications', label: 'Notifications', type: 'module', routePrefixes: ['/notifications'] },
  { key: 'settings', label: 'Settings', type: 'module', routePrefixes: ['/company-profile', '/settings'] },
  { key: 'users', label: 'Users', type: 'module', routePrefixes: ['/users'] },
  { key: 'roles', label: 'Roles', type: 'module', routePrefixes: ['/roles', '/permissions'] }
];

const MODULE_KEYS = MODULE_CATALOG.map((module) => module.key);

function getModuleByRequestPath(path = '') {
  const requestPath = path.startsWith('/') ? path : `/${path}`;
  return [...MODULE_CATALOG].sort((a, b) => {
    const longestA = Math.max(0, ...a.routePrefixes.map((prefix) => prefix.length));
    const longestB = Math.max(0, ...b.routePrefixes.map((prefix) => prefix.length));
    return longestB - longestA;
  }).find((module) =>
    module.routePrefixes.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`))
  );
}

module.exports = {
  MODULE_CATALOG,
  MODULE_KEYS,
  getModuleByRequestPath
};
