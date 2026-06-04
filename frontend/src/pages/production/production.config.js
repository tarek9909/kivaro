/**
 * Production module config. Permission keys, status enums, packaging
 * type/role enums, and tab metadata locked to the backend schema.
 */

export const PRODUCTION_PERMISSIONS = {
  view: 'production.view',
  create: 'production.create',
  complete: 'production.complete'
};

/**
 * Permissions accepted by the parent /production route guard and the
 * Production nav item. Child tabs apply stricter checks.
 */
export const PRODUCTION_PARENT_PERMISSIONS = [
  PRODUCTION_PERMISSIONS.view,
  PRODUCTION_PERMISSIONS.create,
  PRODUCTION_PERMISSIONS.complete
];

export const PACKAGING_TYPES = [
  { value: 'carton_with_packages', label: 'Carton with packages' },
  { value: 'carton_direct', label: 'Carton direct' },
  { value: 'loose_shawl', label: 'Loose shawl' },
  { value: 'custom', label: 'Custom' }
];

export const COMPONENT_ROLES = [
  { value: 'charcoal', label: 'Charcoal' },
  { value: 'carton', label: 'Carton' },
  { value: 'package_bag', label: 'Package bag' },
  { value: 'sticker', label: 'Sticker' },
  { value: 'other', label: 'Other' }
];

export const ACTIVE_FILTER_OPTIONS = [
  { value: '', label: 'All states' },
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' }
];

export const BATCH_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'in_progress', label: 'In progress', tone: 'info' },
  { value: 'batched', label: 'Batched', tone: 'success' },
  { value: 'consumed', label: 'Consumed', tone: 'success' },
  { value: 'completed', label: 'Completed', tone: 'success' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' }
];

export const BATCH_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...BATCH_STATUSES.map(({ value, label }) => ({ value, label }))
];

export function getBatchStatusTone(status) {
  return BATCH_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral';
}

/**
 * Workflow availability for a production batch. Mirrors the backend service
 * rules so the UI never offers an action the API would reject.
 */
export function getAvailableBatchActions(batch) {
  if (!batch) return new Set();
  const status = batch.status;
  const actions = new Set();
  if (status === 'draft') actions.add('start');
  if (status === 'draft' || status === 'in_progress') {
    actions.add('complete');
    actions.add('cancel');
  }
  return actions;
}

export const PRODUCTION_TABS = [
  {
    id: 'batches',
    featureKey: 'production.batches',
    label: 'Batches',
    to: '/production/batches',
    anyOfPermissions: [
      PRODUCTION_PERMISSIONS.view,
      PRODUCTION_PERMISSIONS.create,
      PRODUCTION_PERMISSIONS.complete
    ]
  }
];

export function pickFirstAllowedProductionTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of PRODUCTION_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}
