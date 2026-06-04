import { describe, expect, it } from 'vitest';
import {
  PAYMENT_METHODS,
  PURCHASES_PARENT_PERMISSIONS,
  PURCHASES_PERMISSIONS,
  PURCHASES_TABS,
  PURCHASE_ORDER_STATUSES,
  getAvailableActions,
  getStatusTone,
  pickFirstAllowedPurchasesTab
} from './purchases.config.js';

describe('purchases config', () => {
  it('locks permission strings to backend keys', () => {
    expect(PURCHASES_PERMISSIONS).toEqual({
      view: 'purchase_orders.view',
      create: 'purchase_orders.create',
      approve: 'purchase_orders.approve',
      cancel: 'purchase_orders.cancel',
      receive: 'purchase_orders.receive',
      accountingView: 'accounting.view',
      accountingManage: 'accounting.manage'
    });
  });

  it('locks parent guard permissions', () => {
    expect(PURCHASES_PARENT_PERMISSIONS).toEqual([
      'purchase_orders.view',
      'accounting.view',
      'accounting.manage'
    ]);
  });

  it('lists every backend purchase order status', () => {
    expect(PURCHASE_ORDER_STATUSES.map((entry) => entry.value)).toEqual([
      'draft',
      'pending',
      'approved',
      'partially_received',
      'received',
      'closed',
      'cancelled'
    ]);
  });

  it('lists every payment method enum', () => {
    expect(PAYMENT_METHODS.map((entry) => entry.value)).toEqual([
      'cash',
      'bank_transfer',
      'cheque',
      'other'
    ]);
  });

  it('declares purchase tabs with stable IDs and permission gates', () => {
    expect(PURCHASES_TABS.map((tab) => tab.id)).toEqual([
      'orders',
      'suppliers',
      'payments'
    ]);
    expect(
      PURCHASES_TABS.find((tab) => tab.id === 'orders').anyOfPermissions
    ).toEqual(['purchase_orders.view']);
    expect(
      PURCHASES_TABS.find((tab) => tab.id === 'suppliers').anyOfPermissions
    ).toEqual(['purchase_orders.view']);
    expect(
      PURCHASES_TABS.find((tab) => tab.id === 'payments').anyOfPermissions
    ).toEqual(['accounting.view', 'accounting.manage']);
  });
});

describe('getStatusTone', () => {
  it('maps each status to a glassmorphism tone', () => {
    expect(getStatusTone('draft')).toBe('neutral');
    expect(getStatusTone('pending')).toBe('info');
    expect(getStatusTone('approved')).toBe('brand');
    expect(getStatusTone('partially_received')).toBe('warn');
    expect(getStatusTone('received')).toBe('success');
    expect(getStatusTone('closed')).toBe('neutral');
    expect(getStatusTone('cancelled')).toBe('danger');
    expect(getStatusTone('mystery')).toBe('neutral');
  });
});

describe('getAvailableActions', () => {
  it('returns an empty set for missing input', () => {
    expect(getAvailableActions(undefined)).toEqual(new Set());
    expect(getAvailableActions(null)).toEqual(new Set());
  });

  it('offers edit/submit/approve/cancel for a fresh draft order', () => {
    const actions = getAvailableActions({ status: 'draft', approved_at: null });
    expect(actions).toEqual(new Set(['edit', 'submit', 'approve', 'cancel']));
  });

  it('offers edit/approve/cancel for a pending unapproved order', () => {
    const actions = getAvailableActions({ status: 'pending', approved_at: null });
    expect(actions).toEqual(new Set(['edit', 'approve', 'cancel']));
  });

  it('offers receive once the order has been approved', () => {
    const actions = getAvailableActions({
      status: 'approved',
      approved_at: '2026-05-01T00:00:00Z'
    });
    expect(actions.has('approve')).toBe(false);
    expect(actions.has('receive')).toBe(true);
    expect(actions.has('cancel')).toBe(true);
    expect(actions.has('edit')).toBe(false);
  });

  it('offers receive and close remaining while partially received', () => {
    const actions = getAvailableActions({
      status: 'partially_received',
      approved_at: '2026-05-01T00:00:00Z'
    });
    expect(actions).toEqual(new Set(['receive', 'close']));
  });

  it('hides unsafe cancellation after receipts or payments exist', () => {
    expect(getAvailableActions({
      status: 'approved',
      approved_at: '2026-05-01T00:00:00Z',
      amount_paid: 1
    }).has('cancel')).toBe(false);
    expect(getAvailableActions({
      status: 'approved',
      approved_at: '2026-05-01T00:00:00Z',
      items: [{ received_quantity: 1 }]
    }).has('cancel')).toBe(false);
  });

  it('hides edit unless the order is draft or pending', () => {
    const lockedStatuses = ['approved', 'partially_received', 'received', 'closed', 'cancelled'];
    for (const status of lockedStatuses) {
      const actions = getAvailableActions({ status, approved_at: null });
      expect(actions.has('edit')).toBe(false);
    }
    expect(
      getAvailableActions({ status: 'draft', approved_at: null }).has('edit')
    ).toBe(true);
    expect(
      getAvailableActions({ status: 'pending', approved_at: null }).has('edit')
    ).toBe(true);
    expect(
      getAvailableActions({
        status: 'approved',
        approved_at: '2026-05-01T00:00:00Z'
      }).has('edit')
    ).toBe(false);
  });

  it('locks down a fully received order', () => {
    const actions = getAvailableActions({
      status: 'received',
      approved_at: '2026-05-01T00:00:00Z'
    });
    expect(actions).toEqual(new Set());
  });

  it('locks down a cancelled order', () => {
    const actions = getAvailableActions({ status: 'cancelled', approved_at: null });
    expect(actions).toEqual(new Set());
  });

  it('locks down a closed order', () => {
    const actions = getAvailableActions({ status: 'closed', approved_at: '2026-05-01T00:00:00Z' });
    expect(actions).toEqual(new Set());
  });
});

describe('pickFirstAllowedPurchasesTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no purchases permissions', () => {
    expect(pickFirstAllowedPurchasesTab(makeHas([]))).toBeNull();
  });

  it('routes purchase_orders.view users to /purchases/orders first', () => {
    expect(pickFirstAllowedPurchasesTab(makeHas(['purchase_orders.view']))).toBe(
      '/purchases/orders'
    );
  });

  it('routes accounting.view-only users straight to payments', () => {
    expect(pickFirstAllowedPurchasesTab(makeHas(['accounting.view']))).toBe(
      '/purchases/payments'
    );
  });

  it('routes accounting.manage-only users to payments too', () => {
    expect(pickFirstAllowedPurchasesTab(makeHas(['accounting.manage']))).toBe(
      '/purchases/payments'
    );
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedPurchasesTab(undefined)).toBeNull();
    expect(pickFirstAllowedPurchasesTab(null)).toBeNull();
  });
});
