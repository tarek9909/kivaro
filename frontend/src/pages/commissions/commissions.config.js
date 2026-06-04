/**
 * Commissions module config. Permission keys, status enums, period enums,
 * payment methods, and tab metadata locked to the backend schema.
 */

export const COMMISSIONS_PERMISSIONS = {
  manage: 'commissions.manage'
};

export const COMMISSIONS_PARENT_PERMISSIONS = [COMMISSIONS_PERMISSIONS.manage];

export const TARGET_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export const TARGET_PERIOD_FILTER_OPTIONS = [
  { value: '', label: 'All periods' },
  ...TARGET_PERIODS
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

export const COMMISSION_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'approved', label: 'Approved', tone: 'info' },
  { value: 'paid', label: 'Paid', tone: 'success' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' }
];

export const COMMISSION_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...COMMISSION_STATUSES.map(({ value, label }) => ({ value, label }))
];

export function getCommissionStatusTone(status) {
  return COMMISSION_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral';
}

/**
 * Workflow availability for a commission calculation. Mirrors the backend
 * service rules so the UI never offers actions the API would reject.
 *
 * - draft: can approve or cancel.
 * - approved: can pay.
 * - paid / cancelled: read-only.
 */
export function getAvailableCommissionActions(commission) {
  if (!commission) return new Set();
  const status = commission.status;
  const actions = new Set();
  if (status === 'draft') actions.add('approve');
  if (status === 'approved') actions.add('pay');
  return actions;
}

export const COMMISSIONS_TABS = [
  {
    id: 'rules',
    featureKey: 'commissions.rules',
    label: 'Rules',
    to: '/commissions/rules',
    anyOfPermissions: [COMMISSIONS_PERMISSIONS.manage]
  },
  {
    id: 'calculations',
    featureKey: 'commissions.calculations',
    label: 'Calculations',
    to: '/commissions/calculations',
    anyOfPermissions: [COMMISSIONS_PERMISSIONS.manage]
  }
];

export function pickFirstAllowedCommissionsTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of COMMISSIONS_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}
