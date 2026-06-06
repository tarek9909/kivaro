import { describe, expect, it } from 'vitest';
import { getSummaryMetricKeys, optionRows } from './ReportsLayout.jsx';

describe('ReportsLayout helpers', () => {
  it('extracts picker rows from named API arrays', () => {
    expect(optionRows({ data: { warehouses: [{ id: 1, name: 'Main' }] } })).toEqual([
      { id: 1, name: 'Main' }
    ]);
    expect(optionRows({ data: { item_variants: [{ id: 2, sku: 'SKU-2' }] } })).toEqual([
      { id: 2, sku: 'SKU-2' }
    ]);
    expect(optionRows({ data: { salesmen: [{ id: 3, full_name: 'Maya' }] } })).toEqual([
      { id: 3, full_name: 'Maya' }
    ]);
    expect(optionRows({ data: { suppliers: [{ id: 4, name: 'Supplier' }] } })).toEqual([
      { id: 4, name: 'Supplier' }
    ]);
  });

  it('uses configured report summary metrics instead of generic numeric fields', () => {
    expect(getSummaryMetricKeys('dispatchSummary', {
      metrics: ['dispatch_request_id', 'vat_rate', 'net_total_amount', 'total_collected', 'total_debt'],
      totals: {
        dispatch_request_id: 99,
        vat_rate: 22,
        net_total_amount: 150,
        total_collected: 75,
        total_debt: 75
      }
    })).toEqual(['net_total_amount', 'total_collected', 'total_debt']);
  });

  it('includes salary metrics in commission summaries', () => {
    expect(getSummaryMetricKeys('commissions', {
      metrics: ['sales_amount', 'target_amount', 'base_salary', 'total_commission', 'total_payable'],
      totals: {
        sales_amount: 1000,
        target_amount: 900,
        base_salary: 300,
        total_commission: 50,
        total_payable: 350
      }
    })).toEqual(['sales_amount', 'target_amount', 'base_salary', 'total_commission', 'total_payable']);
  });
});
