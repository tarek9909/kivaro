import { describe, expect, it } from 'vitest';
import {
  CUSTOMERS_PARENT_PERMISSIONS,
  CUSTOMERS_PERMISSIONS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_FILTER_OPTIONS,
  getCustomerStatusTone
} from './customers.config.js';

describe('customers config', () => {
  it('locks permission strings to backend keys', () => {
    expect(CUSTOMERS_PERMISSIONS).toEqual({
      view: 'customers.view',
      create: 'customers.create',
      update: 'customers.update',
      delete: 'customers.delete'
    });
  });

  it('exposes a parent permission list covering all four customer permissions', () => {
    expect(CUSTOMERS_PARENT_PERMISSIONS).toEqual([
      'customers.view',
      'customers.create',
      'customers.update',
      'customers.delete'
    ]);
  });

  it('lists every backend customer status', () => {
    expect(CUSTOMER_STATUSES.map((entry) => entry.value)).toEqual([
      'active',
      'inactive',
      'blocked'
    ]);
  });

  it('exposes filter options that include an All statuses entry', () => {
    expect(CUSTOMER_STATUS_FILTER_OPTIONS[0]).toEqual({
      value: '',
      label: 'All statuses'
    });
  });

  it('maps every status to a glassmorphism tone', () => {
    expect(getCustomerStatusTone('active')).toBe('success');
    expect(getCustomerStatusTone('inactive')).toBe('neutral');
    expect(getCustomerStatusTone('blocked')).toBe('danger');
    expect(getCustomerStatusTone('mystery')).toBe('neutral');
  });
});
