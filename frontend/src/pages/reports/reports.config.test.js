import { describe, expect, it } from 'vitest';
import {
  REPORTS_PARENT_PERMISSIONS,
  REPORTS_PERMISSIONS,
  REPORTS_REGISTRY,
  REPORTS_TABS,
  REPORT_KEYS,
  getReportBySlug,
  pickFirstAllowedReportTab
} from './reports.config.js';

describe('reports config', () => {
  it('locks the permission keys to backend report keys', () => {
    expect(REPORTS_PERMISSIONS).toEqual({ view: 'reports.view', export: 'reports.export' });
    expect(REPORTS_PARENT_PERMISSIONS).toEqual(['reports.view']);
  });

  it('declares every backend report exactly once', () => {
    expect(new Set(REPORT_KEYS)).toEqual(
      new Set([
        'currentStock',
        'customerBalances',
        'salesmanTargetProgress',
        'dispatchSummary',
        'sales',
        'debts',
        'purchases',
        'packagingAssignments',
        'packagingShortages',
        'stockMovements',
        'profitLoss',
        'commissions'
      ])
    );
    for (const key of REPORT_KEYS) {
      expect(REPORTS_REGISTRY[key]).toBeDefined();
      expect(REPORTS_REGISTRY[key].rowsKey).toBeTruthy();
      expect(REPORTS_REGISTRY[key].csvFilename).toMatch(/\.csv$/);
    }
  });

  it('exposes a tab per report under /reports', () => {
    expect(REPORTS_TABS.map((tab) => tab.id)).toEqual([
      'current-stock',
      'customer-balances',
      'salesman-target-progress',
      'dispatch-summary',
      'sales',
      'debts',
      'purchases',
      'packaging-assignments',
      'packaging-shortages',
      'stock-movements',
      'profit-loss',
      'commissions'
    ]);
    for (const tab of REPORTS_TABS) {
      expect(tab.to.startsWith('/reports/')).toBe(true);
      expect(tab.anyOfPermissions).toEqual(['reports.view']);
    }
  });

  it('resolves report slugs to registry keys for route-level module gating', () => {
    expect(getReportBySlug('profit-loss')).toBe('profitLoss');
    expect(getReportBySlug('current-stock')).toBe('currentStock');
    expect(getReportBySlug('unknown')).toBeNull();
  });

  it('only declares filters the backend model accepts', () => {
    expect(REPORTS_REGISTRY.currentStock.filters).toEqual([
      'search',
      'warehouse',
      'item',
      'item_variant'
    ]);
    expect(REPORTS_REGISTRY.customerBalances.filters).toEqual(['search', 'customer']);
    expect(REPORTS_REGISTRY.salesmanTargetProgress.filters).toEqual([
      'search',
      'salesman',
      'location',
      'sublocation',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.dispatchSummary.filters).toEqual([
      'search',
      'dispatch_status',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.sales.filters).toEqual([
      'search',
      'dispatch_status',
      'salesman',
      'customer',
      'location',
      'sublocation',
      'item_variant',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.debts.filters).toEqual([
      'search',
      'debt_status',
      'customer',
      'salesman',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.purchases.filters).toEqual([
      'search',
      'po_status',
      'supplier',
      'warehouse',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.packagingAssignments.filters).toEqual([
      'search',
      'packaging_assignment_status',
      'warehouse',
      'packaging_group',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.packagingShortages.filters).toEqual([
      'search',
      'packaging_assignment_status',
      'warehouse',
      'packaging_group',
      'item_variant',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.stockMovements.filters).toEqual([
      'search',
      'warehouse',
      'item_variant',
      'movement_type',
      'reference_type',
      'date_from',
      'date_to'
    ]);
    expect(REPORTS_REGISTRY.profitLoss.filters).toEqual(['date_from', 'date_to']);
    expect(REPORTS_REGISTRY.commissions.filters).toEqual([
      'search',
      'commission_status',
      'salesman',
      'sublocation',
      'date_from',
      'date_to'
    ]);
  });
});

describe('pickFirstAllowedReportTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no reports permissions', () => {
    expect(pickFirstAllowedReportTab(makeHas([]))).toBeNull();
  });

  it('routes reports.view users to /reports/current-stock first', () => {
    expect(pickFirstAllowedReportTab(makeHas(['reports.view']))).toBe(
      '/reports/current-stock'
    );
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedReportTab(undefined)).toBeNull();
    expect(pickFirstAllowedReportTab(null)).toBeNull();
  });
});
