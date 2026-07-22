/**
 * Report metadata mirrors the item-ledger reporting API.  Every entry owns
 * its route, response collection key, supported filters, and CSV filename.
 */

export const REPORTS_PERMISSIONS = {
  view: 'reports.view',
  export: 'reports.export'
};

export const REPORTS_PARENT_PERMISSIONS = [REPORTS_PERMISSIONS.view];

export const REPORT_KEYS = [
  'currentStock',
  'normalStock',
  'packagingStock',
  'readyStock',
  'stockMovements',
  'packagingOperations',
  'packagingShortages',
  'dispatchSummary',
  'sales',
  'invoices',
  'gifts',
  'posOrders',
  'customerBalances',
  'salesmanPerformance',
  'salesmanTargetProgress',
  'debts',
  'purchases',
  'commissions',
  'profitLoss'
];

export const REPORTS_REGISTRY = {
  currentStock: {
    id: 'current-stock',
    label: 'All item stock',
    eyebrow: 'Inventory',
    description: 'Canonical on-hand, reserved, available, and weighted-average stock value.',
    rowsKey: 'current_stock',
    csvFilename: 'all-item-stock.csv',
    filters: ['search', 'warehouse', 'item', 'stock_health', 'stock_mode']
  },
  normalStock: {
    id: 'normal-stock',
    label: 'Normal stock',
    eyebrow: 'Inventory',
    description: 'Normal item balances, carton equivalents, and reorder health.',
    rowsKey: 'normal_stock',
    csvFilename: 'normal-stock.csv',
    filters: ['search', 'warehouse', 'item', 'stock_health', 'stock_mode']
  },
  packagingStock: {
    id: 'packaging-stock',
    label: 'Packaging stock',
    eyebrow: 'Inventory',
    description: 'Physical cartons, bags, and consumables available for packaging work.',
    rowsKey: 'packaging_stock',
    csvFilename: 'packaging-stock.csv',
    filters: ['search', 'warehouse', 'item', 'stock_health']
  },
  readyStock: {
    id: 'ready-stock',
    label: 'Ready stock',
    eyebrow: 'Packaging',
    description: 'Ready carton containers, remaining inner bags, and retained cost.',
    rowsKey: 'ready_stock',
    csvFilename: 'ready-stock.csv',
    filters: ['search', 'warehouse', 'packaging_group', 'ready_status']
  },
  stockMovements: {
    id: 'stock-movements',
    label: 'Stock movements',
    eyebrow: 'Inventory',
    description: 'Item-ledger and ready-container movements with their exact references.',
    rowsKey: 'stock_movements',
    csvFilename: 'stock-movements.csv',
    filters: ['search', 'warehouse', 'item', 'packaging_group', 'source', 'movement_type', 'reference_type', 'date_from', 'date_to']
  },
  packagingOperations: {
    id: 'packaging-operations',
    label: 'Packaging operations',
    eyebrow: 'Packaging',
    description: 'Completed packaging output, snapshotted costs, and ready-container state.',
    rowsKey: 'packaging_operations',
    csvFilename: 'packaging-operations.csv',
    filters: ['search', 'warehouse', 'packaging_group', 'operation_status', 'date_from', 'date_to']
  },
  packagingShortages: {
    id: 'packaging-shortages',
    label: 'Packaging shortages',
    eyebrow: 'Packaging',
    description: 'Saved group inputs compared with currently available canonical stock.',
    rowsKey: 'packaging_shortages',
    csvFilename: 'packaging-shortages.csv',
    filters: ['search', 'warehouse', 'packaging_group', 'item', 'component_role']
  },
  dispatchSummary: {
    id: 'dispatch-summary',
    label: 'Dispatches',
    eyebrow: 'Delivery',
    description: 'Dispatch totals, collections, debt, and dispatched COGS by request.',
    rowsKey: 'dispatch_summary',
    csvFilename: 'dispatches.csv',
    filters: ['search', 'dispatch_status', 'salesman', 'warehouse', 'date_from', 'date_to']
  },
  sales: {
    id: 'sales',
    label: 'Sales',
    eyebrow: 'Revenue',
    description: 'Physically dispatched sale lines with returns and realized COGS.',
    rowsKey: 'sales',
    csvFilename: 'sales.csv',
    filters: ['search', 'salesman', 'customer', 'location', 'sublocation', 'item', 'packaging_group', 'fulfillment_type', 'date_from', 'date_to']
  },
  invoices: {
    id: 'invoices',
    label: 'Invoices',
    eyebrow: 'Revenue',
    description: 'Issued and voided customer invoices with payment, debt, and gift context.',
    rowsKey: 'invoices',
    csvFilename: 'invoices.csv',
    filters: ['search', 'invoice_status', 'salesman', 'customer', 'date_from', 'date_to']
  },
  gifts: {
    id: 'gifts',
    label: 'Gift COGS',
    eyebrow: 'Promotions',
    description: 'Zero-price gift lines with fulfilled quantity, returns, and promotional cost.',
    rowsKey: 'gifts',
    csvFilename: 'gift-cogs.csv',
    filters: ['search', 'salesman', 'customer', 'item', 'packaging_group', 'fulfillment_type', 'date_from', 'date_to']
  },
  posOrders: {
    id: 'pos-orders',
    label: 'Mini POS orders',
    eyebrow: 'Mini POS',
    description: 'Pending, converted, and cancelled salesman orders without stock reservation.',
    rowsKey: 'pos_orders',
    csvFilename: 'mini-pos-orders.csv',
    filters: ['search', 'pos_status', 'salesman', 'customer', 'warehouse', 'location', 'sublocation', 'date_from', 'date_to']
  },
  customerBalances: {
    id: 'customer-balances',
    label: 'Customer balances',
    eyebrow: 'Receivables',
    description: 'Debt, credits, invoices, receipts, and payments by customer.',
    rowsKey: 'customer_balances',
    csvFilename: 'customer-balances.csv',
    filters: ['search', 'customer', 'salesman', 'location', 'sublocation']
  },
  salesmanPerformance: {
    id: 'salesman-performance',
    label: 'Salesman performance',
    eyebrow: 'Sales',
    description: 'Delivered customers, revenue, COGS, gifts, collections, and Mini POS work.',
    rowsKey: 'salesman_performance',
    csvFilename: 'salesman-performance.csv',
    filters: ['search', 'salesman', 'date_from', 'date_to']
  },
  salesmanTargetProgress: {
    id: 'salesman-target-progress',
    label: 'Salesman target progress',
    eyebrow: 'Sales',
    description: 'Target versus achieved sales by territory and period.',
    rowsKey: 'salesman_target_progress',
    csvFilename: 'salesman-target-progress.csv',
    filters: ['search', 'salesman', 'location', 'sublocation', 'date_from', 'date_to']
  },
  debts: {
    id: 'debts',
    label: 'Debts',
    eyebrow: 'Receivables',
    description: 'Customer debts, payments, adjustments, and remaining amount.',
    rowsKey: 'debts',
    csvFilename: 'debts.csv',
    filters: ['search', 'debt_status', 'customer', 'salesman', 'date_from', 'date_to']
  },
  purchases: {
    id: 'purchases',
    label: 'Purchases',
    eyebrow: 'Procurement',
    description: 'Purchase order value and receipt progress by supplier and warehouse.',
    rowsKey: 'purchases',
    csvFilename: 'purchases.csv',
    filters: ['search', 'purchase_status', 'supplier', 'warehouse', 'date_from', 'date_to']
  },
  commissions: {
    id: 'commissions',
    label: 'Commissions',
    eyebrow: 'Sales',
    description: 'Commission calculations, salary context, and payment progress.',
    rowsKey: 'commissions',
    csvFilename: 'commissions.csv',
    filters: ['search', 'commission_status', 'salesman', 'sublocation', 'date_from', 'date_to']
  },
  profitLoss: {
    id: 'profit-loss',
    label: 'Profit and loss',
    eyebrow: 'Finance',
    description: 'Dispatched revenue and COGS, separated gift cost, operating expense, and profit.',
    rowsKey: 'profit_loss',
    csvFilename: 'profit-and-loss.csv',
    filters: ['date_from', 'date_to']
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

export const PURCHASE_STATUS_OPTIONS = [
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

export const OPERATION_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const STOCK_HEALTH_OPTIONS = [
  { value: '', label: 'All stock health' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'low', label: 'Low' }
];

export const STOCK_MODE_OPTIONS = [
  { value: '', label: 'All stock modes' },
  { value: 'carton_weight', label: 'Carton weight' },
  { value: 'weight', label: 'Weight' },
  { value: 'piece', label: 'Piece' }
];

export const READY_STATUS_OPTIONS = [
  { value: '', label: 'All ready states' },
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
  { value: 'depleted', label: 'Depleted' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const COMPONENT_ROLE_OPTIONS = [
  { value: '', label: 'All component roles' },
  { value: 'raw_input', label: 'Raw input' },
  { value: 'outer_sellable', label: 'Outer sellable' },
  { value: 'inner_sellable', label: 'Inner sellable' },
  { value: 'consumable', label: 'Consumable' }
];

export const MOVEMENT_TYPE_OPTIONS = [
  { value: '', label: 'All movement types' },
  { value: 'opening_balance', label: 'Opening balance' },
  { value: 'purchase_receive', label: 'Purchase receipt' },
  { value: 'stock_adjustment', label: 'Stock adjustment' },
  { value: 'carton_open', label: 'Carton opened' },
  { value: 'packaging_consume', label: 'Packaging consumption' },
  { value: 'packaging_complete', label: 'Packaging completion' },
  { value: 'dispatch_reserve', label: 'Dispatch reservation' },
  { value: 'dispatch_unreserve', label: 'Dispatch release' },
  { value: 'dispatch_out', label: 'Dispatch out' },
  { value: 'gift_out', label: 'Gift out' },
  { value: 'return', label: 'Return' }
];

export const REFERENCE_TYPE_OPTIONS = [
  { value: '', label: 'All references' },
  { value: 'item_opening_balance', label: 'Opening balance' },
  { value: 'purchase_order', label: 'Purchase order' },
  { value: 'packaging_operation', label: 'Packaging operation' },
  { value: 'dispatch_request', label: 'Dispatch request' },
  { value: 'dispatch_item', label: 'Dispatch line' },
  { value: 'stock_adjustment', label: 'Stock adjustment' }
];

export const SOURCE_OPTIONS = [
  { value: '', label: 'All stock sources' },
  { value: 'item', label: 'Item ledger' },
  { value: 'ready_stock', label: 'Ready stock' }
];

export const FULFILLMENT_TYPE_OPTIONS = [
  { value: '', label: 'All fulfillment types' },
  { value: 'normal_carton', label: 'Normal carton' },
  { value: 'normal_loose_unit', label: 'Normal loose unit' },
  { value: 'normal_weight', label: 'Normal weight' },
  { value: 'normal_piece', label: 'Normal piece' },
  { value: 'ready_outer_carton', label: 'Ready carton' },
  { value: 'ready_inner_unit', label: 'Ready inner bag' }
];

export const INVOICE_STATUS_OPTIONS = [
  { value: '', label: 'All invoice statuses' },
  { value: 'issued', label: 'Issued' },
  { value: 'voided', label: 'Voided' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const POS_STATUS_OPTIONS = [
  { value: '', label: 'All Mini POS statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'converted', label: 'Converted' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' }
];
