import { describe, expect, it } from 'vitest';
import {
  ACCOUNTING_PARENT_PERMISSIONS,
  ACCOUNTING_PERMISSIONS,
  ACCOUNTING_TABS,
  CASH_ACCOUNT_TYPES,
  PAYMENT_METHODS,
  SALESMAN_BALANCE_STATUSES,
  STATUSES,
  getSalesmanBalanceStatusTone,
  pickFirstAllowedAccountingTab
} from './accounting.config.js';

describe('accounting config', () => {
  it('locks permission strings to backend keys', () => {
    expect(ACCOUNTING_PERMISSIONS).toEqual({
      view: 'accounting.view',
      manage: 'accounting.manage'
    });
  });

  it('locks parent guard permissions', () => {
    expect(ACCOUNTING_PARENT_PERMISSIONS).toEqual([
      'accounting.view',
      'accounting.manage'
    ]);
  });

  it('lists every backend cash account type', () => {
    expect(CASH_ACCOUNT_TYPES.map((entry) => entry.value)).toEqual([
      'cash',
      'bank',
      'wallet',
      'other'
    ]);
  });

  it('lists every backend status enum', () => {
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

  it('lists every salesman balance status', () => {
    expect(SALESMAN_BALANCE_STATUSES.map((entry) => entry.value)).toEqual([
      'open',
      'closed'
    ]);
  });

  it('declares accounting tabs with stable IDs and per-tab permission gates', () => {
    expect(ACCOUNTING_TABS.map((tab) => tab.id)).toEqual([
      'expense-categories',
      'expenses',
      'cash-accounts',
      'financial-transactions',
      'salesman-balances'
    ]);
    const txn = ACCOUNTING_TABS.find((tab) => tab.id === 'financial-transactions');
    expect(txn.anyOfPermissions).toEqual(['accounting.view']);
    const cats = ACCOUNTING_TABS.find((tab) => tab.id === 'expense-categories');
    expect(cats.anyOfPermissions).toEqual(['accounting.view', 'accounting.manage']);
  });
});

describe('getSalesmanBalanceStatusTone', () => {
  it('maps each status to a glassmorphism tone', () => {
    expect(getSalesmanBalanceStatusTone('open')).toBe('info');
    expect(getSalesmanBalanceStatusTone('closed')).toBe('success');
    expect(getSalesmanBalanceStatusTone('mystery')).toBe('neutral');
  });
});

describe('pickFirstAllowedAccountingTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no accounting permissions', () => {
    expect(pickFirstAllowedAccountingTab(makeHas([]))).toBeNull();
  });

  it('routes accounting.view users to expense categories first', () => {
    expect(pickFirstAllowedAccountingTab(makeHas(['accounting.view']))).toBe(
      '/accounting/expense-categories'
    );
  });

  it('routes accounting.manage-only users to expense categories too', () => {
    expect(pickFirstAllowedAccountingTab(makeHas(['accounting.manage']))).toBe(
      '/accounting/expense-categories'
    );
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedAccountingTab(undefined)).toBeNull();
    expect(pickFirstAllowedAccountingTab(null)).toBeNull();
  });
});
