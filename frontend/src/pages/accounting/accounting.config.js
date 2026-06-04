/**
 * Accounting module config. Permission keys, status enums, and tab metadata
 * locked to the backend schema.
 */

export const ACCOUNTING_PERMISSIONS = {
  view: 'accounting.view',
  manage: 'accounting.manage'
};

/**
 * Permissions accepted by the parent /accounting route guard and the
 * Accounting nav item. The page itself decides which actions to expose.
 */
export const ACCOUNTING_PARENT_PERMISSIONS = [
  ACCOUNTING_PERMISSIONS.view,
  ACCOUNTING_PERMISSIONS.manage
];

export const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...STATUSES
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' }
];

export const CASH_ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' }
];

export const FINANCIAL_DIRECTIONS = [
  { value: '', label: 'All directions' },
  { value: 'in', label: 'Money in' },
  { value: 'out', label: 'Money out' }
];

export const SALESMAN_BALANCE_STATUSES = [
  { value: 'open', label: 'Open', tone: 'info' },
  { value: 'closed', label: 'Closed', tone: 'success' }
];

export const SALESMAN_BALANCE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...SALESMAN_BALANCE_STATUSES.map(({ value, label }) => ({ value, label }))
];

export function getSalesmanBalanceStatusTone(status) {
  return (
    SALESMAN_BALANCE_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral'
  );
}

export const ACCOUNTING_TABS = [
  {
    id: 'expense-categories',
    featureKey: 'accounting.expense-categories',
    label: 'Expense categories',
    to: '/accounting/expense-categories',
    anyOfPermissions: [ACCOUNTING_PERMISSIONS.view, ACCOUNTING_PERMISSIONS.manage]
  },
  {
    id: 'expenses',
    featureKey: 'accounting.expenses',
    label: 'Expenses',
    to: '/accounting/expenses',
    anyOfPermissions: [ACCOUNTING_PERMISSIONS.view, ACCOUNTING_PERMISSIONS.manage]
  },
  {
    id: 'cash-accounts',
    featureKey: 'accounting.cash-accounts',
    label: 'Cash accounts',
    to: '/accounting/cash-accounts',
    anyOfPermissions: [ACCOUNTING_PERMISSIONS.view, ACCOUNTING_PERMISSIONS.manage]
  },
  {
    id: 'financial-transactions',
    featureKey: 'accounting.financial-transactions',
    label: 'Financial transactions',
    to: '/accounting/transactions',
    anyOfPermissions: [ACCOUNTING_PERMISSIONS.view]
  },
  {
    id: 'salesman-balances',
    featureKey: 'accounting.salesman-balances',
    label: 'Salesman balances',
    to: '/accounting/salesman-balances',
    anyOfPermissions: [ACCOUNTING_PERMISSIONS.view]
  }
];

export function pickFirstAllowedAccountingTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of ACCOUNTING_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}
