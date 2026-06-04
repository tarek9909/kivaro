/**
 * Reports module config. Defines permission keys, the report registry, and
 * per-report metadata (filters, columns, summary, csv filename) locked to
 * the backend reports model.
 */

export const REPORTS_PERMISSIONS = {
  view: 'reports.view',
  export: 'reports.export'
};

export const REPORTS_PARENT_PERMISSIONS = [REPORTS_PERMISSIONS.view];

export const REPORT_KEYS = [
  'currentStock',
  'customerBalances',
  'salesmanTargetProgress',
  'dispatchSummary',
  'sales',
  'debts',
  'purchases',
  'packagingAssignments',
  'packagingShortages',
  'stockMovements',
  'profitLoss',
  'commissions'
];

/**
 * Filters supported by the backend model for each report. The UI never
 * sends keys the backend does not honour. Pickers fall back to numeric ID
 * inputs when the operator lacks the matching list permission.
 *
 * `picker` describes which permission is needed to load an option list:
 *   - inventory.view for warehouse/item/variant
 *   - customers.view for customer
 *   - salesmen.manage for salesman
 *   - locations.manage for location/sublocation
 *   - purchase_orders.view for supplier
 */
export const REPORTS_REGISTRY = {
  currentStock: {
    id: 'current-stock',
    label: 'Current stock',
    eyebrow: 'Inventory',
    description: 'Live stock balances per warehouse and variant.',
    rowsKey: 'current_stock',
    csvFilename: 'current-stock.csv',
    filters: ['search', 'warehouse', 'item', 'item_variant', 'item_type']
  },
  customerBalances: {
    id: 'customer-balances',
    label: 'Customer balances',
    eyebrow: 'Receivables',
    description: 'Outstanding customer balances and totals.',
    rowsKey: 'customer_balances',
    csvFilename: 'customer-balances.csv',
    filters: ['search', 'customer']
  },
  salesmanTargetProgress: {
    id: 'salesman-target-progress',
    label: 'Salesman target progress',
    eyebrow: 'Sales',
    description: 'Target versus achieved sales by salesman and period.',
    rowsKey: 'salesman_target_progress',
    csvFilename: 'salesman-target-progress.csv',
    filters: ['search', 'salesman', 'date_from', 'date_to']
  },
  dispatchSummary: {
    id: 'dispatch-summary',
    label: 'Dispatch summary',
    eyebrow: 'Operations',
    description: 'Dispatch route totals by status and date.',
    rowsKey: 'dispatch_summary',
    csvFilename: 'dispatch-summary.csv',
    filters: ['search', 'dispatch_status', 'date_from', 'date_to']
  },
  sales: {
    id: 'sales',
    label: 'Sales',
    eyebrow: 'Sales',
    description: 'Line item sales across dispatches.',
    rowsKey: 'sales',
    csvFilename: 'sales.csv',
    filters: [
      'search',
      'dispatch_status',
      'salesman',
      'customer',
      'location',
      'sublocation',
      'item_variant',
      'date_from',
      'date_to'
    ]
  },
  debts: {
    id: 'debts',
    label: 'Debts',
    eyebrow: 'Receivables',
    description: 'Customer debts with status and remaining balance.',
    rowsKey: 'debts',
    csvFilename: 'debts.csv',
    filters: ['search', 'debt_status', 'customer', 'salesman', 'date_from', 'date_to']
  },
  purchases: {
    id: 'purchases',
    label: 'Purchases',
    eyebrow: 'Procurement',
    description: 'Purchase orders by supplier and warehouse.',
    rowsKey: 'purchases',
    csvFilename: 'purchases.csv',
    filters: ['search', 'po_status', 'supplier', 'warehouse', 'date_from', 'date_to']
  },
  packagingAssignments: {
    id: 'packaging-assignments',
    label: 'Packaging assignments',
    eyebrow: 'Packaging',
    description: 'Saved packaging calculations, carton counts, costs, and consumption status.',
    rowsKey: 'packaging_assignments',
    csvFilename: 'packaging-assignments.csv',
    filters: ['search', 'packaging_assignment_status', 'warehouse', 'packaging_group', 'date_from', 'date_to']
  },
  packagingShortages: {
    id: 'packaging-shortages',
    label: 'Packaging shortages',
    eyebrow: 'Packaging',
    description: 'Packaging material shortages from saved assignment calculations.',
    rowsKey: 'packaging_shortages',
    csvFilename: 'packaging-shortages.csv',
    filters: ['search', 'packaging_assignment_status', 'warehouse', 'packaging_group', 'item_variant', 'date_from', 'date_to']
  },
  stockMovements: {
    id: 'stock-movements',
    label: 'Stock movements',
    eyebrow: 'Inventory',
    description: 'Stock in/out movements with references.',
    rowsKey: 'stock_movements',
    csvFilename: 'stock-movements.csv',
    filters: [
      'search',
      'warehouse',
      'item_variant',
      'movement_type',
      'reference_type',
      'date_from',
      'date_to'
    ]
  },
  profitLoss: {
    id: 'profit-loss',
    label: 'Profit and loss',
    eyebrow: 'Finance',
    description: 'Accrual income, accrual expenses, and net profit between two dates. Supplier payments are shown as cash outflow context.',
    rowsKey: 'profit_loss',
    csvFilename: 'profit-loss.csv',
    filters: ['date_from', 'date_to']
  },
  commissions: {
    id: 'commissions',
    label: 'Commissions',
    eyebrow: 'Sales',
    description: 'Commission calculations by salesman and sublocation.',
    rowsKey: 'commissions',
    csvFilename: 'commissions.csv',
    filters: ['search', 'commission_status', 'salesman', 'sublocation', 'date_from', 'date_to']
  }
};

export const REPORTS_TABS = REPORT_KEYS.map((key) => {
  const entry = REPORTS_REGISTRY[key];
  return {
    id: entry.id,
    label: entry.label,
    to: `/reports/${entry.id}`,
    reportKey: key,
    featureKey: `reports.${entry.id}`,
    anyOfPermissions: [REPORTS_PERMISSIONS.view]
  };
});

export function getReportBySlug(slug) {
  return REPORT_KEYS.find((key) => REPORTS_REGISTRY[key].id === slug) || null;
}

export function pickFirstAllowedReportTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of REPORTS_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}

/**
 * Backend status enum vocabularies used by the report filters.
 */
export const DISPATCH_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'partially_settled', label: 'Partially settled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const DEBT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'written_off', label: 'Written off' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const PO_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'partially_received', label: 'Partially received' },
  { value: 'received', label: 'Received' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const COMMISSION_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const PACKAGING_ASSIGNMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'consumed', label: 'Consumed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const ITEM_TYPE_OPTIONS = [
  { value: '', label: 'All item types' },
  { value: 'raw_charcoal', label: 'Raw charcoal' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'finished_product', label: 'Finished product' },
  { value: 'service', label: 'Service' },
  { value: 'other', label: 'Other' }
];

export const MOVEMENT_TYPE_OPTIONS = [
  { value: '', label: 'All movement types' },
  { value: 'purchase_receive', label: 'Purchase receive' },
  { value: 'production_consume', label: 'Production consume' },
  { value: 'production_output', label: 'Production output' },
  { value: 'dispatch_reserve', label: 'Dispatch reserve' },
  { value: 'dispatch_unreserve', label: 'Dispatch unreserve' },
  { value: 'dispatch_out', label: 'Dispatch out' },
  { value: 'dispatch_return', label: 'Dispatch return' },
  { value: 'sales_settle', label: 'Sales settle' },
  { value: 'damage', label: 'Damage' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer_in', label: 'Transfer in' },
  { value: 'transfer_out', label: 'Transfer out' }
];

export const REFERENCE_TYPE_OPTIONS = [
  { value: '', label: 'All references' },
  { value: 'purchase_receipt', label: 'Purchase receipt' },
  { value: 'production_batch', label: 'Production batch' },
  { value: 'packaging_assignment', label: 'Packaging assignment' },
  { value: 'dispatch_request', label: 'Dispatch request' },
  { value: 'dispatch_return', label: 'Dispatch return' },
  { value: 'stock_adjustment', label: 'Stock adjustment' }
];
