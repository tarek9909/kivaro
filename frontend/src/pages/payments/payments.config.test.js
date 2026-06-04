import { describe, expect, it } from 'vitest';
import {
  DEBT_STATUSES,
  PAYMENTS_PARENT_PERMISSIONS,
  PAYMENTS_PERMISSIONS,
  PAYMENTS_TABS,
  PAYMENT_METHODS,
  RECEIPT_TYPES,
  getAvailableDebtActions,
  getDebtStatusTone,
  pickFirstAllowedPaymentsTab
} from './payments.config.js';

describe('payments config', () => {
  it('locks permission strings to backend keys', () => {
    expect(PAYMENTS_PERMISSIONS).toEqual({
      debts: 'debts.manage',
      accountingView: 'accounting.view',
      accountingManage: 'accounting.manage',
      receiptsPrint: 'dispatch.print'
    });
  });

  it('locks parent guard permissions', () => {
    expect(PAYMENTS_PARENT_PERMISSIONS).toEqual([
      'debts.manage',
      'accounting.view',
      'accounting.manage',
      'dispatch.print'
    ]);
  });

  it('lists every backend debt status enum', () => {
    expect(DEBT_STATUSES.map((entry) => entry.value)).toEqual([
      'pending',
      'partially_paid',
      'paid',
      'written_off',
      'cancelled'
    ]);
  });

  it('lists every backend payment method enum', () => {
    expect(PAYMENT_METHODS.map((entry) => entry.value)).toEqual([
      'cash',
      'bank_transfer',
      'cheque',
      'other'
    ]);
  });

  it('lists receipt types used for filtering', () => {
    expect(RECEIPT_TYPES.map((entry) => entry.value)).toEqual([
      'sale',
      'debt',
      'payment'
    ]);
  });

  it('declares payments tabs with stable IDs and permission gates', () => {
    expect(PAYMENTS_TABS.map((tab) => tab.id)).toEqual([
      'debts',
      'customer-payments',
      'customer-credits',
      'receipts'
    ]);
    expect(PAYMENTS_TABS.find((tab) => tab.id === 'debts').anyOfPermissions).toEqual([
      'debts.manage'
    ]);
    expect(
      PAYMENTS_TABS.find((tab) => tab.id === 'customer-payments').anyOfPermissions
    ).toEqual(['accounting.view', 'accounting.manage']);
    expect(
      PAYMENTS_TABS.find((tab) => tab.id === 'customer-credits').anyOfPermissions
    ).toEqual(['accounting.view']);
    expect(
      PAYMENTS_TABS.find((tab) => tab.id === 'receipts').anyOfPermissions
    ).toEqual(['dispatch.print']);
  });
});

describe('getDebtStatusTone', () => {
  it('maps each status to a glassmorphism tone', () => {
    expect(getDebtStatusTone('pending')).toBe('info');
    expect(getDebtStatusTone('partially_paid')).toBe('warn');
    expect(getDebtStatusTone('paid')).toBe('success');
    expect(getDebtStatusTone('written_off')).toBe('neutral');
    expect(getDebtStatusTone('cancelled')).toBe('danger');
    expect(getDebtStatusTone('mystery')).toBe('neutral');
  });
});

describe('getAvailableDebtActions', () => {
  it('returns an empty set for missing input', () => {
    expect(getAvailableDebtActions(undefined)).toEqual(new Set());
    expect(getAvailableDebtActions(null)).toEqual(new Set());
  });

  it('offers pay/updateStatus for a pending debt', () => {
    expect(getAvailableDebtActions({ status: 'pending' })).toEqual(
      new Set(['pay', 'updateStatus'])
    );
  });

  it('offers pay/updateStatus for a partially paid debt', () => {
    expect(getAvailableDebtActions({ status: 'partially_paid' })).toEqual(
      new Set(['pay', 'updateStatus'])
    );
  });

  it('offers updateStatus only on a paid debt (no further payments)', () => {
    expect(getAvailableDebtActions({ status: 'paid' })).toEqual(new Set(['updateStatus']));
  });

  it('offers updateStatus only on a written off debt', () => {
    expect(getAvailableDebtActions({ status: 'written_off' })).toEqual(
      new Set(['updateStatus'])
    );
  });

  it('offers updateStatus only on a cancelled debt', () => {
    expect(getAvailableDebtActions({ status: 'cancelled' })).toEqual(
      new Set(['updateStatus'])
    );
  });
});

describe('pickFirstAllowedPaymentsTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no payments permissions', () => {
    expect(pickFirstAllowedPaymentsTab(makeHas([]))).toBeNull();
  });

  it('routes debts.manage users to /payments/debts first', () => {
    expect(pickFirstAllowedPaymentsTab(makeHas(['debts.manage']))).toBe('/payments/debts');
  });

  it('routes accounting.view-only users to /payments/customer-payments', () => {
    expect(pickFirstAllowedPaymentsTab(makeHas(['accounting.view']))).toBe(
      '/payments/customer-payments'
    );
  });

  it('routes dispatch.print-only users straight to /payments/receipts', () => {
    expect(pickFirstAllowedPaymentsTab(makeHas(['dispatch.print']))).toBe(
      '/payments/receipts'
    );
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedPaymentsTab(undefined)).toBeNull();
    expect(pickFirstAllowedPaymentsTab(null)).toBeNull();
  });
});
