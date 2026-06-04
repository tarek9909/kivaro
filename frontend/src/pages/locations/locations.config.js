/**
 * Locations / sublocations / salesmen / targets module config. Locks the
 * permission keys, status enums, and target periods to the backend schema.
 */

export const LOCATIONS_PERMISSIONS = {
  locations: 'locations.manage',
  salesmen: 'salesmen.manage',
  targets: 'targets.manage'
};

export const LOCATIONS_PARENT_PERMISSIONS = [
  LOCATIONS_PERMISSIONS.locations,
  LOCATIONS_PERMISSIONS.salesmen,
  LOCATIONS_PERMISSIONS.targets
];

export const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...STATUSES
];

export const TARGET_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export const TARGET_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'active', label: 'Active', tone: 'success' },
  { value: 'closed', label: 'Closed', tone: 'info' },
  { value: 'cancelled', label: 'Cancelled', tone: 'danger' }
];

export const TARGET_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...TARGET_STATUSES.map(({ value, label }) => ({ value, label }))
];

export function getTargetStatusTone(status) {
  return TARGET_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral';
}

export const LOCATIONS_TABS = [
  {
    id: 'locations',
    featureKey: 'locations.locations',
    label: 'Locations',
    to: '/locations/areas',
    anyOfPermissions: [LOCATIONS_PERMISSIONS.locations]
  },
  {
    id: 'sublocations',
    featureKey: 'locations.sublocations',
    label: 'Sublocations',
    to: '/locations/sublocations',
    anyOfPermissions: [LOCATIONS_PERMISSIONS.locations]
  },
  {
    id: 'salesmen',
    featureKey: 'locations.salesmen',
    label: 'Salesmen',
    to: '/locations/salesmen',
    anyOfPermissions: [LOCATIONS_PERMISSIONS.salesmen]
  },
  {
    id: 'targets',
    featureKey: 'locations.targets',
    label: 'Targets',
    to: '/locations/targets',
    anyOfPermissions: [LOCATIONS_PERMISSIONS.targets]
  }
];

export function pickFirstAllowedLocationsTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of LOCATIONS_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}
