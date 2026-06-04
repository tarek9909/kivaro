/**
 * Payments / debts / receipts module config. Permission keys, status enums,
 * and tab metadata locked to the backend schema.
 */

export const PAYMENTS_PERMISSIONS = {
  debts: 'debts.manage',
  accountingView: 'accounting.view',
  accountingManage: 'accounting.manage',
  receiptsPrint: 'dispatch.print'
};

/**
 * Permissions accepted by the parent /payments route guard and the nav item.
 */
export const PAYMENTS_PARENT_PERMISSIONS = [
  PAYMENTS_PERMISSIONS.debts,
  PAYMENTS_PERMISSIONS.accountingView,
  PAYMENTS_PERMISSIONS.accountingManage,
  PAYMENTS_PERMISSIONS.receiptsPrint
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' }
];

export const DEBT_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'info' },
  { value: 'partially_paid', label: 'Partially paid', tone: 'warn' },
  { value: 'paid', label: 'Paid', tone: 'success' },
  { value: 'written_off', label: 'Written off', tone: 'neutral' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' }
];

export const DEBT_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...DEBT_STATUSES.map(({ value, label }) => ({ value, label }))
];

export function getDebtStatusTone(status) {
  return DEBT_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral';
}

export const RECEIPT_TYPES = [
  { value: 'sale', label: 'Sale' },
  { value: 'debt', label: 'Debt' },
  { value: 'payment', label: 'Payment' }
];

export const RECEIPT_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All receipt types' },
  ...RECEIPT_TYPES
];

export const PAYMENTS_TABS = [
  {
    id: 'debts',
    featureKey: 'payments.debts',
    label: 'Customer debts',
    to: '/payments/debts',
    anyOfPermissions: [PAYMENTS_PERMISSIONS.debts]
  },
  {
    id: 'customer-payments',
    featureKey: 'payments.customer-payments',
    label: 'Customer payments',
    to: '/payments/customer-payments',
    anyOfPermissions: [
      PAYMENTS_PERMISSIONS.accountingView,
      PAYMENTS_PERMISSIONS.accountingManage
    ]
  },
  {
    id: 'customer-credits',
    featureKey: 'payments.customer-credits',
    label: 'Customer credits',
    to: '/payments/customer-credits',
    anyOfPermissions: [PAYMENTS_PERMISSIONS.accountingView]
  },
  {
    id: 'receipts',
    featureKey: 'payments.receipts',
    label: 'Receipts',
    to: '/payments/receipts',
    anyOfPermissions: [PAYMENTS_PERMISSIONS.receiptsPrint]
  }
];

export function pickFirstAllowedPaymentsTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of PAYMENTS_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}

/**
 * Workflow availability for a customer debt. Mirrors the backend service.
 *
 * - pay: backend allows payDebt only on pending or partially_paid.
 * - updateStatus: backend has no status-based restriction; expose for any
 *   loaded debt as long as the user has debts.manage.
 */
export function getAvailableDebtActions(debt) {
  if (!debt) return new Set();
  const status = debt.status;
  const actions = new Set();
  actions.add('updateStatus');
  if (status === 'pending' || status === 'partially_paid') {
    actions.add('pay');
  }
  return actions;
}
