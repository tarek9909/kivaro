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

const CANONICAL_KEYS = [
  'currentStock',
  'normalStock',
  'packagingStock',
  'readyStock',
  'stockMovements',
  'packagingOperations',
  'packagingShortages',
  'dispatchSummary',
  'sales',
  'invoices',
  'gifts',
  'posOrders',
  'customerBalances',
  'salesmanPerformance',
  'salesmanTargetProgress',
  'debts',
  'purchases',
  'commissions',
  'profitLoss'
];

describe('reports config', () => {
  it('locks the permission keys to the report API contract', () => {
    expect(REPORTS_PERMISSIONS).toEqual({ view: 'reports.view', export: 'reports.export' });
    expect(REPORTS_PARENT_PERMISSIONS).toEqual(['reports.view']);
  });

  it('declares every canonical report exactly once', () => {
    expect(new Set(REPORT_KEYS)).toEqual(new Set(CANONICAL_KEYS));
    for (const key of REPORT_KEYS) {
      expect(REPORTS_REGISTRY[key]).toBeDefined();
      expect(REPORTS_REGISTRY[key].rowsKey).toBeTruthy();
      expect(REPORTS_REGISTRY[key].csvFilename).toMatch(/\.csv$/);
    }
  });

  it('exposes every report under the reports route with feature gating', () => {
    expect(REPORTS_TABS).toHaveLength(CANONICAL_KEYS.length);
    expect(REPORTS_TABS.map((tab) => tab.id)).toEqual(REPORT_KEYS.map((key) => REPORTS_REGISTRY[key].id));
    for (const tab of REPORTS_TABS) {
      expect(tab.to).toBe(`/reports/${tab.id}`);
      expect(tab.featureKey).toBe(`reports.${tab.id}`);
      expect(tab.anyOfPermissions).toEqual(['reports.view']);
    }
  });

  it('only declares filter names accepted by the report query schema', () => {
    const accepted = new Set([
      'search', 'warehouse', 'item', 'packaging_group', 'customer', 'salesman',
      'location', 'sublocation', 'supplier', 'stock_health', 'stock_mode',
      'ready_status', 'component_role', 'movement_type', 'reference_type', 'source',
      'fulfillment_type', 'invoice_status', 'pos_status', 'dispatch_status',
      'operation_status', 'debt_status', 'purchase_status', 'commission_status',
      'date_from', 'date_to'
    ]);
    for (const report of Object.values(REPORTS_REGISTRY)) {
      for (const filter of report.filters) expect(accepted.has(filter)).toBe(true);
    }
  });

  it('resolves slugs and selects all-item stock as the first report', () => {
    expect(getReportBySlug('ready-stock')).toBe('readyStock');
    expect(getReportBySlug('gifts')).toBe('gifts');
    expect(getReportBySlug('unknown')).toBeNull();
    expect(pickFirstAllowedReportTab((permission) => permission === 'reports.view')).toBe('/reports/current-stock');
  });
});
