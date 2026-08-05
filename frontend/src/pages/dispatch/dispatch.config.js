/**
 * Dispatch module config. Permission keys, status enums, payment methods,
 * and workflow availability locked to the backend service rules.
 */

export const DISPATCH_PERMISSIONS = {
  view: 'dispatch.view',
  create: 'dispatch.create',
  approve: 'dispatch.approve',
  closeout: 'delivery.closeout',
  settle: 'dispatch.settle',
  print: 'dispatch.print',
  salesmanWorkspace: 'salesman_workspace.view'
};

/**
 * Permissions accepted by the parent /dispatch route guard and the
 * Dispatch nav item. The page itself decides which actions to expose.
 */
export const DISPATCH_PARENT_PERMISSIONS = [
  DISPATCH_PERMISSIONS.view,
  DISPATCH_PERMISSIONS.create,
  DISPATCH_PERMISSIONS.approve,
  'delivery.release',
  'delivery.dispatch',
  'delivery.record_returns',
  'finance.settle_deliveries',
  DISPATCH_PERMISSIONS.closeout,
  DISPATCH_PERMISSIONS.settle,
  DISPATCH_PERMISSIONS.print,
  DISPATCH_PERMISSIONS.salesmanWorkspace
];

export const DISPATCH_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'pending_approval', label: 'Pending approval', tone: 'info' },
  { value: 'approved', label: 'Approved', tone: 'brand' },
  { value: 'delivery', label: 'Delivery', tone: 'warn' },
  { value: 'partially_settled', label: 'Closeout pending', tone: 'warn' },
  { value: 'completed', label: 'Completed', tone: 'success' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' }
];

export const DISPATCH_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...DISPATCH_STATUSES.map(({ value, label }) => ({ value, label }))
];

/** Status groups used by the Orders & deliveries page tabs. */
export const DISPATCH_WORKFLOW_TABS = [
  {
    id: 'all',
    label: 'All',
    statuses: null
  },
  {
    id: 'orders',
    label: 'Orders',
    statuses: ['draft', 'pending_approval', 'cancelled']
  },
  {
    id: 'deliveries',
    label: 'Deliveries',
    statuses: ['approved', 'delivery', 'partially_settled']
  },
  {
    id: 'completed',
    label: 'Completed',
    statuses: ['completed']
  }
];

export function getDispatchWorkflowTab(tabId) {
  return DISPATCH_WORKFLOW_TABS.find((tab) => tab.id === tabId) || DISPATCH_WORKFLOW_TABS[0];
}

export function getDispatchStatusFilterOptions(tabId) {
  const tab = getDispatchWorkflowTab(tabId);
  if (!tab || !tab.statuses) {
    return DISPATCH_STATUS_FILTER_OPTIONS;
  }
  const statuses = new Set(tab.statuses);
  return [
    { value: '', label: `All ${tab.label.toLowerCase()} statuses` },
    ...DISPATCH_STATUSES
      .filter((entry) => statuses.has(entry.value))
      .map(({ value, label }) => ({ value, label }))
  ];
}

export function getDispatchStatusTone(status) {
  return DISPATCH_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral';
}

export function getDispatchEntityLabel(status) {
  return ['approved', 'delivery', 'partially_settled', 'completed'].includes(status)
    ? 'Delivery'
    : 'Order';
}

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' }
];

/**
 * Workflow availability for a dispatch request. Mirrors the backend
 * service rules so the UI never offers actions the API would reject.
 *
 * Status flow:
 *   draft -> pending_approval -> approved -> delivery -> completed
 * A submitted revision can be reworked by a creator, which voids the issued
 * invoices and invalidates the document checklist before it returns to draft.
 */
export function getAvailableDispatchActions(dispatchRequest) {
  if (!dispatchRequest) return new Set();
  const status = dispatchRequest.status;
  const actions = new Set();

  if (status === 'draft') {
    actions.add('edit');
    actions.add('addCustomer');
    actions.add('addItem');
    actions.add('submit');
    actions.add('cancel');
  }
  if (status === 'pending_approval') {
    actions.add('approve');
    actions.add('rework');
    actions.add('cancel');
  }
  if (status === 'approved') {
    actions.add('rework');
    actions.add('dispatchStock');
    actions.add('cancel');
  }
  if (['delivery', 'partially_settled'].includes(status)) {
    actions.add('createReturn');
    actions.add('createCloseout');
  }
  if (status === 'completed') {
    actions.add('createReturn');
  }
  return actions;
}

export const DISPATCH_TABS = [
  {
    id: 'requests',
    featureKey: 'dispatch.requests',
    label: 'Orders & deliveries',
    to: '/dispatch/requests',
    anyOfPermissions: [
      DISPATCH_PERMISSIONS.view,
      DISPATCH_PERMISSIONS.create,
      DISPATCH_PERMISSIONS.approve,
      'delivery.release',
      'delivery.dispatch',
      'delivery.record_returns',
      'finance.settle_deliveries',
      DISPATCH_PERMISSIONS.closeout,
      DISPATCH_PERMISSIONS.settle,
      DISPATCH_PERMISSIONS.print,
      DISPATCH_PERMISSIONS.salesmanWorkspace
    ]
  }
];

export function pickFirstAllowedDispatchTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of DISPATCH_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}
