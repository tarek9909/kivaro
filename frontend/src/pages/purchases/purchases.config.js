/**
 * Purchases module config: backend permission strings, status enums,
 * payment methods, tabs, and helpers. Single source of truth so route
 * guards, nav visibility, action permissions, and tab visibility never
 * drift from the backend.
 */

export const PURCHASES_PERMISSIONS = {
  view: 'purchase_orders.view',
  create: 'purchase_orders.create',
  approve: 'purchase_orders.approve',
  cancel: 'purchase_orders.cancel',
  receive: 'purchase_orders.receive',
  accountingView: 'accounting.view',
  accountingManage: 'accounting.manage'
};

/**
 * Permissions accepted by the parent /purchases route. A user with any of
 * these can land on the workspace; child routes apply stricter checks.
 */
export const PURCHASES_PARENT_PERMISSIONS = [
  PURCHASES_PERMISSIONS.view,
  PURCHASES_PERMISSIONS.accountingView,
  PURCHASES_PERMISSIONS.accountingManage
];

export const PURCHASE_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'pending', label: 'Pending', tone: 'info' },
  { value: 'approved', label: 'Approved', tone: 'brand' },
  { value: 'partially_received', label: 'Partially received', tone: 'warn' },
  { value: 'received', label: 'Received', tone: 'success' },
  { value: 'closed', label: 'Closed', tone: 'neutral' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' }
];

export const PURCHASE_ORDER_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...PURCHASE_ORDER_STATUSES.map(({ value, label }) => ({ value, label }))
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' }
];

export const SUPPLIER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export const PURCHASES_TABS = [
  {
    id: 'orders',
    featureKey: 'purchases.orders',
    label: 'Purchase orders',
    to: '/purchases/orders',
    anyOfPermissions: [PURCHASES_PERMISSIONS.view]
  },
  {
    id: 'suppliers',
    featureKey: 'purchases.suppliers',
    label: 'Suppliers',
    to: '/purchases/suppliers',
    anyOfPermissions: [PURCHASES_PERMISSIONS.view]
  },
  {
    id: 'payments',
    featureKey: 'purchases.payments',
    label: 'Supplier payments',
    to: '/purchases/payments',
    anyOfPermissions: [
      PURCHASES_PERMISSIONS.accountingView,
      PURCHASES_PERMISSIONS.accountingManage
    ]
  }
];

/**
 * Map a status to a glassmorphism Badge tone.
 */
export function getStatusTone(status) {
  return PURCHASE_ORDER_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral';
}

/**
 * Workflow action availability rules. These mirror the backend service
 * logic exactly so the UI never offers an action the API will reject.
 *
 * `purchaseOrder` is the detail object as returned by `GET /purchase-orders/:id`,
 * which includes `status`, `approved_at`, and the `items` array.
 */
export function getAvailableActions(purchaseOrder) {
  if (!purchaseOrder) return new Set();
  const status = purchaseOrder.status;
  const approved = Boolean(purchaseOrder.approved_at);
  const actions = new Set();

  if (status === 'draft' || status === 'pending') {
    actions.add('edit');
  }

  if (status === 'draft') {
    actions.add('submit');
  }

  if (!approved && (status === 'draft' || status === 'pending')) {
    actions.add('approve');
  }

  const hasReceipts = (purchaseOrder.receipts || []).length > 0 ||
    (purchaseOrder.items || []).some((item) => Number(item.received_quantity || 0) > 0);
  const hasPayments = Number(purchaseOrder.amount_paid || 0) > 0;

  if (['draft', 'pending', 'approved'].includes(status) && !hasReceipts && !hasPayments) {
    actions.add('cancel');
  }

  if (status === 'approved' || status === 'partially_received') {
    actions.add('receive');
  }

  if (status === 'partially_received') {
    actions.add('close');
  }

  return actions;
}

/**
 * Pick the first inventory tab the user is allowed to see.
 */
export function pickFirstAllowedPurchasesTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of PURCHASES_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}
