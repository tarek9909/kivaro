import { describe, expect, it } from 'vitest';
import {
  buildCustomerExport,
  buildSalesmanExport,
  CUSTOMER_EXPORT_OPTIONS,
  SALESMAN_EXPORT_OPTIONS
} from './csvExport.js';

describe('CSV export query shaping', () => {
  it('offers both filtered and all-customer directory exports alongside every customer history dataset', () => {
    expect(CUSTOMER_EXPORT_OPTIONS.map((option) => option.value)).toEqual([
      'directory_filtered',
      'directory_all',
      'invoices',
      'receipts',
      'payments',
      'debts'
    ]);
  });

  it('keeps the active customer filters but never leaks pagination into the CSV endpoint', () => {
    const { option, params } = buildCustomerExport({
      optionValue: 'invoices',
      filters: {
        page: 4,
        limit: 20,
        search: 'Corner Shop',
        status: 'active',
        location_id: 2,
        sublocation_id: 3,
        salesman_id: 4
      }
    });

    expect(option.filename).toBe('customers-invoices.csv');
    expect(params).toEqual({
      dataset: 'invoices',
      search: 'Corner Shop',
      status: 'active',
      location_id: 2,
      sublocation_id: 3,
      salesman_id: 4
    });
  });

  it('intentionally drops filters for the all-customer directory export', () => {
    expect(buildCustomerExport({
      optionValue: 'directory_all',
      filters: { search: 'Corner Shop', status: 'inactive', location_id: 2 }
    }).params).toEqual({ dataset: 'directory' });
  });

  it('maps the current salesman status filter to the export contract and preserves applicable filters', () => {
    const { option, params } = buildSalesmanExport({
      optionValue: 'invoices',
      filters: {
        page: 2,
        limit: 20,
        search: 'Maya',
        status: 'active',
        salesman_id: 8,
        invoice_status: 'issued',
        date_from: '2026-07-01',
        date_to: '2026-07-31'
      }
    });

    expect(option.filename).toBe('salesmen-invoices.csv');
    expect(params).toEqual({
      dataset: 'invoices',
      search: 'Maya',
      salesman_id: 8,
      invoice_status: 'issued',
      date_from: '2026-07-01',
      date_to: '2026-07-31',
      salesman_status: 'active'
    });
  });

  it('exposes every salesman export dataset', () => {
    expect(SALESMAN_EXPORT_OPTIONS.map((option) => option.value)).toEqual([
      'performance',
      'invoices',
      'delivered_customers',
      'revenue'
    ]);
  });
});
