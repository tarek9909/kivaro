/**
 * Customers module config. Permission keys, statuses, and defaults locked
 * to the backend schema and route table.
 */

export const CUSTOMERS_PERMISSIONS = {
  view: 'customers.view',
  create: 'customers.create',
  update: 'customers.update',
  delete: 'customers.delete'
};

/**
 * Permissions accepted by the parent /customers route guard and the
 * Customers nav item. A user with any of these can land on the page; the
 * page itself decides whether to show the list, the new-customer form, or
 * a permission-required state.
 */
export const CUSTOMERS_PARENT_PERMISSIONS = [
  CUSTOMERS_PERMISSIONS.view,
  CUSTOMERS_PERMISSIONS.create,
  CUSTOMERS_PERMISSIONS.update,
  CUSTOMERS_PERMISSIONS.delete
];

export const CUSTOMER_STATUSES = [
  { value: 'active', label: 'Active', tone: 'success' },
  { value: 'inactive', label: 'Inactive', tone: 'neutral' },
  { value: 'blocked', label: 'Blocked', tone: 'danger' }
];

export const CUSTOMER_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...CUSTOMER_STATUSES.map(({ value, label }) => ({ value, label }))
];

export function getCustomerStatusTone(status) {
  return CUSTOMER_STATUSES.find((entry) => entry.value === status)?.tone || 'neutral';
}
