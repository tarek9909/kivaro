const { _private } = require('../src/modules/reports/reports.controller');

describe('reports summary metrics', () => {
  test('summarizes only configured business metrics', () => {
    const summary = _private.buildSummary([
      {
        dispatch_request_id: 10,
        salesman_id: 3,
        vat_rate: 11,
        net_total_amount: 100,
        total_collected: 65,
        total_debt: 35
      },
      {
        dispatch_request_id: 11,
        salesman_id: 4,
        vat_rate: 11,
        net_total_amount: 50,
        total_collected: 10,
        total_debt: 40
      }
    ], 'dispatch_summary');

    expect(summary.rows).toBe(2);
    expect(summary.totals).toMatchObject({
      net_total_amount: 150,
      total_collected: 75,
      total_debt: 75
    });
    expect(summary.totals.dispatch_request_id).toBeUndefined();
    expect(summary.totals.salesman_id).toBeUndefined();
    expect(summary.totals.vat_rate).toBeUndefined();
    expect(summary.metrics).toContain('net_total_amount');
  });

  test('summarizes salary and salary plus commission in commission reports', () => {
    const summary = _private.buildSummary([
      {
        target_amount: 1000,
        sales_amount: 1200,
        base_salary: 300,
        total_commission: 60,
        total_payable: 360
      },
      {
        target_amount: 800,
        sales_amount: 700,
        base_salary: 250,
        total_commission: 35,
        total_payable: 285
      }
    ], 'commissions');

    expect(summary.totals).toMatchObject({
      base_salary: 550,
      total_commission: 95,
      total_payable: 645
    });
    expect(summary.metrics).toEqual([
      'target_amount',
      'sales_amount',
      'base_salary',
      'total_commission',
      'total_payable'
    ]);
  });
});
