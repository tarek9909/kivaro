import { describe, expect, it } from 'vitest';
import {
  COMMISSIONS_PARENT_PERMISSIONS,
  COMMISSIONS_PERMISSIONS,
  COMMISSIONS_TABS,
  COMMISSION_STATUSES,
  PAYMENT_METHODS,
  STATUSES,
  TARGET_PERIODS,
  getAvailableCommissionActions,
  getCommissionStatusTone,
  pickFirstAllowedCommissionsTab
} from './commissions.config.js';

describe('commissions config', () => {
  it('locks permission strings to backend keys', () => {
    expect(COMMISSIONS_PERMISSIONS).toEqual({ manage: 'commissions.manage' });
  });

  it('locks parent guard permissions', () => {
    expect(COMMISSIONS_PARENT_PERMISSIONS).toEqual(['commissions.manage']);
  });

  it('lists every backend target period', () => {
    expect(TARGET_PERIODS.map((entry) => entry.value)).toEqual([
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'yearly'
    ]);
  });

  it('lists every backend rule status enum', () => {
    expect(STATUSES.map((entry) => entry.value)).toEqual(['active', 'inactive']);
  });

  it('lists every backend payment method enum', () => {
    expect(PAYMENT_METHODS.map((entry) => entry.value)).toEqual([
      'cash',
      'bank_transfer',
      'cheque',
      'other'
    ]);
  });

  it('lists every commission calculation status', () => {
    expect(COMMISSION_STATUSES.map((entry) => entry.value)).toEqual([
      'draft',
      'approved',
      'paid',
      'cancelled'
    ]);
  });

  it('declares commissions tabs with stable IDs and permission gates', () => {
    expect(COMMISSIONS_TABS.map((tab) => tab.id)).toEqual(['rules', 'calculations']);
    for (const tab of COMMISSIONS_TABS) {
      expect(tab.anyOfPermissions).toEqual(['commissions.manage']);
    }
  });
});

describe('getCommissionStatusTone', () => {
  it('maps each status to a glassmorphism tone', () => {
    expect(getCommissionStatusTone('draft')).toBe('neutral');
    expect(getCommissionStatusTone('approved')).toBe('info');
    expect(getCommissionStatusTone('paid')).toBe('success');
    expect(getCommissionStatusTone('cancelled')).toBe('danger');
    expect(getCommissionStatusTone('mystery')).toBe('neutral');
  });
});

describe('getAvailableCommissionActions', () => {
  it('returns an empty set for missing input', () => {
    expect(getAvailableCommissionActions(undefined)).toEqual(new Set());
    expect(getAvailableCommissionActions(null)).toEqual(new Set());
  });

  it('offers approve only for a draft commission', () => {
    expect(getAvailableCommissionActions({ status: 'draft' })).toEqual(
      new Set(['approve'])
    );
  });

  it('offers pay only for an approved commission', () => {
    expect(getAvailableCommissionActions({ status: 'approved' })).toEqual(
      new Set(['pay'])
    );
  });

  it('locks a paid commission', () => {
    expect(getAvailableCommissionActions({ status: 'paid' })).toEqual(new Set());
  });

  it('locks a cancelled commission', () => {
    expect(getAvailableCommissionActions({ status: 'cancelled' })).toEqual(new Set());
  });
});

describe('pickFirstAllowedCommissionsTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no commissions permissions', () => {
    expect(pickFirstAllowedCommissionsTab(makeHas([]))).toBeNull();
  });

  it('routes commissions.manage users to /commissions/rules first', () => {
    expect(pickFirstAllowedCommissionsTab(makeHas(['commissions.manage']))).toBe(
      '/commissions/rules'
    );
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedCommissionsTab(undefined)).toBeNull();
    expect(pickFirstAllowedCommissionsTab(null)).toBeNull();
  });
});
