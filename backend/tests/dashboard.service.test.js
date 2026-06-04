jest.mock('../src/modules/dashboard/dashboard.model', () => ({
  getActivity: jest.fn(),
  getBenchmarks: jest.fn(),
  getNotifications: jest.fn(),
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
      monthly_collections: '250.50',
      cash_balance: '1000.00',
      open_receivables: '75.25',
      active_dispatches: 3,
      active_batches: 2,
      unavailable_stock_variants: 4
    });
    model.getBenchmarks.mockResolvedValue({
      dispatch_done: 2,
      dispatch_total: 4,
      production_done: 1,
      production_total: 2,
      purchase_done: 3,
      purchase_total: 6,
      target_progress: '42.4'
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
        variant_name: 'Bag'
      }
    ]);
    model.getNotifications.mockResolvedValue([
      { id: 7, title: 'Low stock', message: 'Main warehouse is low' }
    ]);

    const dashboard = await service.getDashboard({ id: 11, store_id: 22 });

    expect(model.getSummary).toHaveBeenCalledWith(22);
    expect(model.getNotifications).toHaveBeenCalledWith(22, 11);
    expect(dashboard.summary).toEqual({
      monthly_collections: 250.5,
      cash_balance: 1000,
      open_receivables: 75.25,
      active_dispatches: 3,
      active_batches: 2,
      unavailable_stock_variants: 4
    });
    expect(dashboard.benchmarks).toMatchObject([
      { key: 'dispatch_completion', value: 50, done: 2, total: 4 },
      { key: 'production_completion', value: 50, done: 1, total: 2 },
      { key: 'salesman_target_progress', value: 42 },
      { key: 'purchase_receiving', value: 50, done: 3, total: 6 }
    ]);
    expect(dashboard.activity[0]).toMatchObject({
      id: 9,
      tag: 'stock adjustment',
      title: 'Removed 5 units',
      description: 'Charcoal (Bag) at Main',
      reference: 'adjustment #44'
    });
    expect(dashboard.notifications).toHaveLength(1);
  });

  test('returns an empty payload when no store is in scope', async () => {
    const dashboard = await service.getDashboard({ id: 1, is_superadmin: true });

    expect(dashboard).toEqual({
      summary: {},
      benchmarks: [],
      activity: [],
      notifications: []
    });
    expect(model.getSummary).not.toHaveBeenCalled();
  });
});
