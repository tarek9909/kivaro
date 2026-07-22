jest.mock('../src/modules/pos/pos.model', () => ({
  findOrdersByIds: jest.fn(),
  getOrderLines: jest.fn(),
  findSaleCatalogEntryById: jest.fn(),
  setOrderStatus: jest.fn(),
  findSalesmanByUserId: jest.fn(),
  getSalesmanWorkspaceSummary: jest.fn(),
  listSalesmanTerritories: jest.fn(),
  listSalesmanWorkspaceCommissions: jest.fn(),
  listSalesmanWorkspaceDebts: jest.fn(),
  listSalesmanWorkspaceDispatches: jest.fn(),
  listSalesmanWorkspaceTargets: jest.fn(),
  listOrders: jest.fn()
}));

jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/modules/customers/customers.service', () => ({
  createCustomer: jest.fn(),
  listCustomers: jest.fn()
}));

const model = require('../src/modules/pos/pos.model');
const db = require('../src/bootstrap/db');
const service = require('../src/modules/pos/pos.service');

const manager = {
  id: 9,
  store_id: 1,
  permissions: ['pos.review', 'pos.gift.approve']
};

function pendingOrder(overrides = {}) {
  return {
    id: 10,
    store_id: 1,
    order_number: 'POS-10',
    salesman_id: 3,
    salesman_name: 'Maya',
    warehouse_id: 4,
    warehouse_name: 'Main',
    customer_id: 8,
    location_id: 2,
    sublocation_id: 5,
    status: 'pending',
    ...overrides
  };
}

function pieceOffer(overrides = {}) {
  return {
    id: 20,
    store_id: 1,
    entry_type: 'normal_piece',
    item_id: 30,
    packaging_group_id: null,
    display_name: 'Charcoal lighter',
    unit_label: 'pc',
    default_price: '5.0000',
    vat_rate: '11.0000',
    status: 'active',
    is_pos_active: 1,
    item_status: 'active',
    ...overrides
  };
}

function line(overrides = {}) {
  return {
    id: 50,
    pos_order_id: 10,
    sale_catalog_entry_id: 20,
    item_id: 30,
    packaging_group_id: null,
    line_type: 'sale',
    fulfillment_type: 'normal_piece',
    quantity: '2.0000',
    unit_price: '5.0000',
    vat_rate: '11.0000',
    ...overrides
  };
}

describe('Mini POS dispatch preparation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    model.findOrdersByIds.mockResolvedValue([pendingOrder()]);
    model.getOrderLines.mockResolvedValue([line()]);
    model.findSaleCatalogEntryById.mockResolvedValue(pieceOffer());
    db.query.mockResolvedValue([{ quantity: '5.0000' }]);
  });

  test('combines same-salesman pending orders without reserving stock', async () => {
    const result = await service.prepareSelectedOrders({
      pos_order_ids: [10]
    }, manager);

    expect(result.can_convert).toBe(true);
    expect(result.dispatch_payload).toMatchObject({
      salesman_id: 3,
      warehouse_id: 4,
      source_pos_order_ids: [10]
    });
    expect(result.dispatch_payload.customers[0].lines[0]).toMatchObject({
      source_pos_order_line_id: 50,
      line_type: 'sale',
      unit_price: '5.0000'
    });
    expect(model.setOrderStatus).not.toHaveBeenCalled();
  });

  test('requires an explicit manager decision for requested gifts', async () => {
    model.getOrderLines.mockResolvedValue([
      line({ id: 51, line_type: 'free_gift', unit_price: '0.0000' })
    ]);

    const result = await service.prepareSelectedOrders({
      pos_order_ids: [10]
    }, manager);

    expect(result.gift_decisions_required).toBe(true);
    expect(result.can_convert).toBe(false);
    expect(result.dispatch_payload).toBeNull();
  });

  test('reports shortages when selected quantity exceeds canonical availability', async () => {
    model.getOrderLines.mockResolvedValue([line({ quantity: '6.0000' })]);

    const result = await service.prepareSelectedOrders({
      pos_order_ids: [10]
    }, manager);

    expect(result.can_convert).toBe(false);
    expect(result.shortages).toEqual([
      expect.objectContaining({
        sale_catalog_entry_id: 20,
        required_quantity: '6.0000',
        available_quantity: '5.0000',
        shortage_quantity: '1.0000'
      })
    ]);
  });
});

describe('salesman workspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    model.findSalesmanByUserId.mockResolvedValue({
      id: 3,
      store_id: 1,
      user_id: 12,
      full_name: 'Maya',
      code: 'SL-03',
      status: 'active'
    });
    model.getSalesmanWorkspaceSummary.mockResolvedValue({ dispatched_revenue: '140.0000' });
    model.listSalesmanWorkspaceDispatches.mockResolvedValue([{ id: 41, dispatch_number: 'DISP-41' }]);
    model.listSalesmanWorkspaceDebts.mockResolvedValue([{ id: 51, debt_number: 'DEBT-51' }]);
    model.listSalesmanWorkspaceCommissions.mockResolvedValue([{ id: 61, total_commission: '7.0000' }]);
    model.listSalesmanWorkspaceTargets.mockResolvedValue([{ salesman_id: 3, target_amount: '100.0000' }]);
    model.listSalesmanTerritories.mockResolvedValue([{ sublocation_id: 5 }]);
    model.listOrders.mockResolvedValue({ rows: [{ id: 71, order_number: 'POS-71' }] });
  });

  test('returns only the linked salesman’s server-derived workspace data', async () => {
    const result = await service.getOwnWorkspace({ date_from: '2026-01-01', limit: 10 }, {
      id: 12,
      store_id: 1,
      permissions: ['salesman_workspace.view']
    });

    expect(result.salesman).toEqual({ id: 3, full_name: 'Maya', code: 'SL-03' });
    expect(result.metrics.dispatched_revenue).toBe('140.0000');
    expect(result.recent_dispatches).toEqual([{ id: 41, dispatch_number: 'DISP-41' }]);
    expect(result.recent_debts).toEqual([{ id: 51, debt_number: 'DEBT-51' }]);
    expect(result.recent_commissions).toEqual([{ id: 61, total_commission: '7.0000' }]);
    expect(model.listSalesmanWorkspaceDispatches).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 1,
      salesman_id: 3,
      date_from: '2026-01-01',
      limit: 10
    }));
    expect(model.listOrders).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 1,
      salesman_id: 3
    }));
  });
});
