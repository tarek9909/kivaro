jest.mock('../src/modules/dashboard/dashboard.model', () => ({
  getActivity: jest.fn(),
  getBenchmarks: jest.fn(),
  getFinancialSummary: jest.fn(),
  getNotifications: jest.fn(),
  getPackagingShortageCount: jest.fn(),
  getPackagingShortages: jest.fn(),
  getPendingPosWork: jest.fn(),
  getSalesChart: jest.fn(),
  getSummary: jest.fn()
}));

const model = require('../src/modules/dashboard/dashboard.model');
const service = require('../src/modules/dashboard/dashboard.service');

describe('dashboard service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns a normalized store dashboard payload', async () => {
    model.getSummary.mockResolvedValue({
      collections: '250.50',
      cash_balance: '1000.00',
      open_receivables: '75.25',
      active_dispatches: 3,
      pending_pos_orders: 2,
      pending_pos_salesmen: 1,
      raw_stock_value: '450.00',
      packaging_stock_value: '55.00',
      ready_stock_value: '125.00',
      stock_balance_count: 6,
      low_stock_balances: 2
    });
    model.getFinancialSummary.mockResolvedValue({
      sales_revenue: '500.00',
      sales_cogs: '260.00',
      gift_cogs: '15.00',
      operating_expenses: '25.00',
      commission_expenses: '10.00',
      debt_write_offs: '0.00',
      gross_profit_after_gifts: '225.00',
      net_profit: '190.00'
    });
    model.getBenchmarks.mockResolvedValue({
      dispatch_done: 2,
      dispatch_total: 4,
      pos_converted: 3,
      pos_total: 6,
      collected_value: '250.50',
      dispatched_value: '500.00'
    });
    model.getActivity.mockResolvedValue([
      {
        id: 9,
        movement_type: 'stock_adjustment',
        quantity_change: -5,
        reference_type: 'adjustment',
        reference_id: 44,
        created_at: '2026-05-27T10:00:00.000Z',
        warehouse_name: 'Main',
        item_name: 'Charcoal',
        unit_label: 'kg'
      }
    ]);
    model.getNotifications.mockResolvedValue([
      { id: 7, title: 'Low stock', message: 'Main warehouse is low' }
    ]);
    model.getPackagingShortages.mockResolvedValue([
      { packaging_group_id: 4, required_quantity: '3', quantity_on_hand: '1', quantity_reserved: '0', available_quantity: '1', shortage_quantity: '2' }
    ]);
    model.getPendingPosWork.mockResolvedValue([
      { salesman_id: 3, pending_order_count: '2', pending_customer_count: '2', pending_sale_total: '40', requested_gift_quantity: '1', requested_gift_line_count: '1' }
    ]);
    model.getSalesChart.mockResolvedValue([
      { chart_date: '2026-05-27', sales_revenue: '100', sales_cogs: '50', gift_cogs: '5', gross_profit_after_gifts: '45' }
    ]);
    model.getPackagingShortageCount.mockResolvedValue(1);

    const dashboard = await service.getDashboard({ id: 11, store_id: 22 });

    expect(model.getSummary).toHaveBeenCalledWith(22, expect.objectContaining({ date_from: expect.any(String), date_to: expect.any(String) }));
    expect(model.getNotifications).toHaveBeenCalledWith(22, 11);
    expect(dashboard.summary).toMatchObject({
      collections: 250.5,
      cash_balance: 1000,
      open_receivables: 75.25,
      active_dispatches: 3,
      pending_pos_orders: 2,
      pending_pos_salesmen: 1,
      packaging_shortage_count: 1,
      raw_stock_value: 450,
      packaging_stock_value: 55,
      ready_stock_value: 125,
      stock_balance_count: 6,
      low_stock_balances: 2,
      healthy_stock_balances: 4,
      sales_revenue: 500,
      sales_cogs: 260,
      gift_cogs: 15,
      net_profit: 190
    });
    expect(dashboard.benchmarks).toMatchObject([
      { key: 'dispatch_completion', value: 50, done: 2, total: 4 },
      { key: 'pos_conversion', value: 50, done: 3, total: 6 },
      { key: 'stock_health', value: 67, done: 4, total: 6 },
      { key: 'collection_rate', value: 50, done: 250.5, total: 500 }
    ]);
    expect(dashboard.activity[0]).toMatchObject({
      id: 9,
      tag: 'stock adjustment',
      title: 'Removed 5 kg',
      description: 'Charcoal at Main',
      reference: 'adjustment #44'
    });
    expect(dashboard.pending_pos_work[0].pending_order_count).toBe(2);
    expect(dashboard.packaging_shortages[0].shortage_quantity).toBe(2);
    expect(dashboard.sales_chart[0].gross_profit_after_gifts).toBe(45);
    expect(dashboard.notifications).toHaveLength(1);
  });

  test('returns an empty payload when no store is in scope', async () => {
    const dashboard = await service.getDashboard({ id: 1, is_superadmin: true });

    expect(dashboard).toEqual({
      summary: {},
      financial: {},
      benchmarks: [],
      activity: [],
      pending_pos_work: [],
      packaging_shortages: [],
      sales_chart: [],
      notifications: [],
      date_range: {}
    });
    expect(model.getSummary).not.toHaveBeenCalled();
  });
});
