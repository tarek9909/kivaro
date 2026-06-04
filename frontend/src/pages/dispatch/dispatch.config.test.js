import { describe, expect, it } from 'vitest';
import {
  DISPATCH_PARENT_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  DISPATCH_STATUSES,
  DISPATCH_STATUS_FILTER_OPTIONS,
  DISPATCH_TABS,
  PAYMENT_METHODS,
  getAvailableDispatchActions,
  getDispatchStatusTone,
  pickFirstAllowedDispatchTab
} from './dispatch.config.js';

describe('dispatch config', () => {
  it('locks permission strings to backend keys', () => {
    expect(DISPATCH_PERMISSIONS).toEqual({
      view: 'dispatch.view',
      create: 'dispatch.create',
      approve: 'dispatch.approve',
      settle: 'dispatch.settle',
      print: 'dispatch.print'
    });
  });

  it('locks parent guard permissions to all dispatch capability keys', () => {
    expect(DISPATCH_PARENT_PERMISSIONS).toEqual([
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'dispatch.settle',
      'dispatch.print'
    ]);
  });

  it('lists every backend dispatch status', () => {
    expect(DISPATCH_STATUSES.map((entry) => entry.value)).toEqual([
      'draft',
      'pending_approval',
      'approved',
      'dispatched',
      'partially_settled',
      'completed',
      'cancelled'
    ]);
    expect(DISPATCH_STATUS_FILTER_OPTIONS[0]).toEqual({
      value: '',
      label: 'All statuses'
    });
  });

  it('lists every backend payment method enum', () => {
    expect(PAYMENT_METHODS.map((entry) => entry.value)).toEqual([
      'cash',
      'bank_transfer',
      'cheque',
      'other'
    ]);
  });

  it('declares dispatch tabs with stable IDs and broad permission gates', () => {
    expect(DISPATCH_TABS.map((tab) => tab.id)).toEqual(['requests']);
    const requestsTab = DISPATCH_TABS.find((tab) => tab.id === 'requests');
    expect(requestsTab.to).toBe('/dispatch/requests');
    expect(requestsTab.anyOfPermissions).toEqual([
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'dispatch.settle',
      'dispatch.print'
    ]);
  });
});

describe('getDispatchStatusTone', () => {
  it('maps each status to a glassmorphism tone', () => {
    expect(getDispatchStatusTone('draft')).toBe('neutral');
    expect(getDispatchStatusTone('pending_approval')).toBe('info');
    expect(getDispatchStatusTone('approved')).toBe('brand');
    expect(getDispatchStatusTone('dispatched')).toBe('warn');
    expect(getDispatchStatusTone('partially_settled')).toBe('info');
    expect(getDispatchStatusTone('completed')).toBe('success');
    expect(getDispatchStatusTone('cancelled')).toBe('danger');
    expect(getDispatchStatusTone('mystery')).toBe('neutral');
  });
});

describe('getAvailableDispatchActions', () => {
  it('returns an empty set for missing input', () => {
    expect(getAvailableDispatchActions(undefined)).toEqual(new Set());
    expect(getAvailableDispatchActions(null)).toEqual(new Set());
  });

  it('offers edit/addCustomer/addItem/submit/cancel for a draft request', () => {
    expect(getAvailableDispatchActions({ status: 'draft' })).toEqual(
      new Set(['edit', 'addCustomer', 'addItem', 'submit', 'cancel'])
    );
  });

  it('offers approve/cancel for a pending approval request', () => {
    expect(getAvailableDispatchActions({ status: 'pending_approval' })).toEqual(
      new Set(['approve', 'cancel'])
    );
  });

  it('offers dispatchStock/cancel for an approved request', () => {
    expect(getAvailableDispatchActions({ status: 'approved' })).toEqual(
      new Set(['dispatchStock', 'cancel'])
    );
  });

  it('offers createReturn/createSettlement for a dispatched request', () => {
    expect(getAvailableDispatchActions({ status: 'dispatched' })).toEqual(
      new Set(['createReturn', 'createSettlement'])
    );
  });

  it('locks down a completed request', () => {
    expect(getAvailableDispatchActions({ status: 'completed' })).toEqual(new Set());
  });

  it('offers createSettlement for a partially settled request', () => {
    expect(getAvailableDispatchActions({ status: 'partially_settled' })).toEqual(
      new Set(['createSettlement'])
    );
  });

  it('locks down a cancelled request', () => {
    expect(getAvailableDispatchActions({ status: 'cancelled' })).toEqual(new Set());
  });
});

describe('pickFirstAllowedDispatchTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no dispatch permissions', () => {
    expect(pickFirstAllowedDispatchTab(makeHas([]))).toBeNull();
  });

  it('routes any dispatch capability to /dispatch/requests', () => {
    const capabilities = [
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'dispatch.settle',
      'dispatch.print'
    ];
    for (const capability of capabilities) {
      expect(pickFirstAllowedDispatchTab(makeHas([capability]))).toBe(
        '/dispatch/requests'
      );
    }
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedDispatchTab(undefined)).toBeNull();
    expect(pickFirstAllowedDispatchTab(null)).toBeNull();
  });
});
