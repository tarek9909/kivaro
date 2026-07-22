const mockConnection = { execute: jest.fn() };

jest.mock('../src/modules/dispatch/dispatch.model', () => ({
  createDispatchItem: jest.fn(),
  createDispatchLineAllocation: jest.fn(),
  createDocumentGeneration: jest.fn(),
  createInvoice: jest.fn(),
  createInvoiceLine: jest.fn(),
  findDispatchCustomerById: jest.fn(),
  findDispatchItemById: jest.fn(),
  findDispatchRequestById: jest.fn(),
  findSalesmanByUserId: jest.fn(),
  deleteDispatchItem: jest.fn(),
  getDispatchCustomers: jest.fn(),
  getDispatchItems: jest.fn(),
  getDocumentChecklist: jest.fn(),
  getInvoiceById: jest.fn(),
  getInvoicesForDispatch: jest.fn(),
  lockDispatchRequest: jest.fn(),
  listDispatchRequests: jest.fn(),
  listInvoices: jest.fn(),
  recalculateDispatchTotals: jest.fn(),
  updateDispatchItem: jest.fn(),
  updateDispatchRequest: jest.fn(),
  voidInvoicesForDispatchRevision: jest.fn()
}));

jest.mock('../src/modules/inventory/inventory.model', () => ({
  findItemById: jest.fn(),
  findWarehouseById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({
  reserveItemStock: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({}));
jest.mock('../src/modules/customers/customers.model', () => ({}));
jest.mock('../src/modules/accounting/accounting.model', () => ({}));
jest.mock('../src/modules/packaging/packaging.service', () => ({
  assertCatalogOffer: jest.fn()
}));
jest.mock('../src/modules/packaging/packaging.model', () => ({}));
jest.mock('../src/modules/pos/pos.service', () => ({}));
jest.mock('../src/services/storeConfig.service', () => ({}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback(mockConnection))
}));

const model = require('../src/modules/dispatch/dispatch.model');
const packagingService = require('../src/modules/packaging/packaging.service');
const service = require('../src/modules/dispatch/dispatch.service');

const actor = { id: 9, store_id: 1 };

function dispatch(overrides = {}) {
  return {
    id: 41,
    store_id: 1,
    dispatch_number: 'DISP-41',
    warehouse_id: 2,
    salesman_id: 3,
    request_date: '2026-07-22',
    revision: 1,
    status: 'draft',
    ...overrides
  };
}

function dispatchCustomer(overrides = {}) {
  return {
    id: 31,
    store_id: 1,
    dispatch_request_id: 41,
    dispatch_status: 'draft',
    customer_id: 8,
    customer_name: 'Retail customer',
    ...overrides
  };
}

function normalPieceOffer(overrides = {}) {
  return {
    id: 20,
    store_id: 1,
    status: 'active',
    entry_type: 'normal_piece',
    item_id: 30,
    packaging_group_id: null,
    display_name: 'Charcoal lighter',
    unit_label: 'piece',
    default_price: '5.0000',
    vat_rate: '11.0000',
    ...overrides
  };
}

function dispatchLine(overrides = {}) {
  return {
    id: 51,
    dispatch_customer_id: 31,
    dispatch_request_id: 41,
    item_id: 30,
    packaging_group_id: null,
    line_type: 'sale',
    fulfillment_type: 'normal_piece',
    quantity: '2.0000',
    unit_price: '5.0000',
    unit_cost: '0.0000',
    subtotal_amount: '10.0000',
    vat_rate: '11.0000',
    vat_amount: '1.1000',
    line_total: '11.1000',
    item_name_snapshot: 'Charcoal lighter',
    unit_label_snapshot: 'piece',
    ...overrides
  };
}

function configureDispatchReadback(current = dispatch({ status: 'pending_approval' })) {
  model.findDispatchRequestById.mockResolvedValue(current);
  model.getDispatchCustomers.mockResolvedValue([dispatchCustomer()]);
  model.getDispatchItems.mockResolvedValue([dispatchLine()]);
  model.getInvoicesForDispatch.mockResolvedValue([]);
  model.getDocumentChecklist.mockResolvedValue({
    customer_table_generated: false,
    quantity_table_generated: false,
    required_invoice_count: 1,
    generated_invoice_count: 0,
    ready_for_approval: false
  });
}

describe('typed dispatch lines, invoices, and document gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.execute.mockReset();
    mockConnection.execute.mockResolvedValue([[]]);
    configureDispatchReadback();
    model.findDispatchCustomerById.mockResolvedValue(dispatchCustomer());
    packagingService.assertCatalogOffer.mockResolvedValue(normalPieceOffer());
    model.createDispatchItem.mockImplementation(async (payload) => ({ id: 51, ...payload }));
  });

  test('creates a free-gift line from a catalog offer with zero sale price and VAT', async () => {
    const created = await service.addItem(31, {
      sale_catalog_entry_id: 20,
      quantity: 2,
      unit_price: 999,
      line_type: 'free_gift'
    }, actor);

    expect(packagingService.assertCatalogOffer).toHaveBeenCalledWith(20, actor);
    expect(model.createDispatchItem).toHaveBeenCalledWith(expect.objectContaining({
      dispatch_customer_id: 31,
      sale_catalog_entry_id: 20,
      item_id: 30,
      line_type: 'free_gift',
      fulfillment_type: 'normal_piece',
      quantity: '2.0000',
      unit_price: '0.0000',
      vat_rate: '0.0000',
      line_total: '0.0000',
      item_name_snapshot: 'Charcoal lighter'
    }), mockConnection);
    expect(model.recalculateDispatchTotals).toHaveBeenCalledWith(mockConnection, 41);
    expect(created.line_type).toBe('free_gift');
  });

  test('updates a draft line through its catalog offer and recalculates zero-priced gifts', async () => {
    model.findDispatchItemById.mockResolvedValue({
      ...dispatchLine(),
      store_id: 1,
      dispatch_status: 'draft',
      sale_catalog_entry_id: 20
    });
    model.updateDispatchItem.mockImplementation(async (id, payload) => ({ id, ...payload }));

    const updated = await service.updateItem(51, {
      quantity: 3,
      line_type: 'free_gift'
    }, actor);

    expect(model.updateDispatchItem).toHaveBeenCalledWith(51, expect.objectContaining({
      sale_catalog_entry_id: 20,
      quantity: '3.0000',
      line_type: 'free_gift',
      unit_price: '0.0000',
      vat_amount: '0.0000',
      line_total: '0.0000'
    }), mockConnection);
    expect(model.recalculateDispatchTotals).toHaveBeenCalledWith(mockConnection, 41);
    expect(updated.line_type).toBe('free_gift');
  });

  test('deletes only a draft line and recalculates its dispatch totals', async () => {
    model.findDispatchItemById.mockResolvedValue({
      ...dispatchLine(),
      store_id: 1,
      dispatch_status: 'draft'
    });
    model.deleteDispatchItem.mockResolvedValue(undefined);
    model.findDispatchRequestById.mockResolvedValue(dispatch({ status: 'draft' }));

    await service.deleteItem(51, actor);

    expect(model.deleteDispatchItem).toHaveBeenCalledWith(51, mockConnection);
    expect(model.recalculateDispatchTotals).toHaveBeenCalledWith(mockConnection, 41);
  });

  test('submitting a draft issues a revision-scoped invoice and snapshots gift lines', async () => {
    const draft = dispatch();
    model.lockDispatchRequest.mockResolvedValue(draft);
    model.getDispatchCustomers.mockResolvedValue([dispatchCustomer()]);
    model.getDispatchItems.mockResolvedValue([
      dispatchLine(),
      dispatchLine({
        id: 52,
        line_type: 'free_gift',
        quantity: '1.0000',
        unit_price: '0.0000',
        subtotal_amount: '0.0000',
        vat_rate: '0.0000',
        vat_amount: '0.0000',
        line_total: '0.0000',
        item_name_snapshot: 'Complimentary lighter'
      })
    ]);
    model.createInvoice.mockResolvedValue({ id: 501, invoice_number: 'INV-501' });
    model.findDispatchRequestById.mockResolvedValue(dispatch({ status: 'pending_approval' }));

    await service.submitDispatch(41, actor);

    expect(model.recalculateDispatchTotals).toHaveBeenCalledWith(mockConnection, 41);
    expect(model.createInvoice).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      dispatch_request_id: 41,
      dispatch_customer_id: 31,
      revision: 1,
      subtotal_amount: '10.0000',
      vat_amount: '1.1000',
      total_amount: '11.1000'
    }));
    expect(model.createInvoiceLine).toHaveBeenCalledTimes(2);
    expect(model.createInvoiceLine).toHaveBeenLastCalledWith(mockConnection, expect.objectContaining({
      invoice_id: 501,
      dispatch_item_id: 52,
      line_type: 'free_gift',
      unit_price: '0.0000',
      line_total: '0.0000'
    }));
    expect(model.updateDispatchRequest).toHaveBeenCalledWith(41, expect.objectContaining({
      status: 'pending_approval',
      submitted_by: 9
    }), mockConnection);
  });

  test('blocks approval until the current revision has every required document', async () => {
    model.lockDispatchRequest.mockResolvedValue(dispatch({ status: 'pending_approval', revision: 3 }));
    model.getDocumentChecklist.mockResolvedValue({
      customer_table_generated: true,
      quantity_table_generated: true,
      required_invoice_count: 2,
      generated_invoice_count: 1,
      ready_for_approval: false
    });

    await expect(service.approveDispatch(41, 9, actor)).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('Generate the customer table')
    });

    expect(model.getDispatchCustomers).not.toHaveBeenCalled();
    expect(model.createDispatchLineAllocation).not.toHaveBeenCalled();
    expect(model.updateDispatchRequest).not.toHaveBeenCalled();
  });

  test('voids the current invoice revision before returning a submitted dispatch to draft', async () => {
    model.lockDispatchRequest.mockResolvedValue(dispatch({ status: 'pending_approval', revision: 2 }));
    model.findDispatchRequestById.mockResolvedValue(dispatch({ status: 'draft', revision: 3 }));

    await service.reworkDispatch(41, { reason: 'Customer correction' }, actor);

    expect(model.voidInvoicesForDispatchRevision).toHaveBeenCalledWith(
      mockConnection,
      41,
      2,
      9,
      'Customer correction'
    );
    expect(mockConnection.execute).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'draft', revision = revision + 1"),
      [41]
    );
  });
});

describe('ready-stock source allocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.execute.mockReset();
    model.createDispatchLineAllocation.mockResolvedValue(701);
    model.updateDispatchItem.mockResolvedValue({});
  });

  test('reserves exact ready inner bags with proportional container cost', async () => {
    mockConnection.execute.mockImplementation(async (sql) => {
      if (sql.includes('FROM ready_stock_containers')) {
        return [[{
          id: 900,
          warehouse_id: 2,
          packaging_group_id: 7,
          initial_inner_quantity: '15.0000',
          remaining_inner_quantity: '15.0000',
          remaining_cost: '14.7000',
          status: 'full'
        }]];
      }
      if (sql.includes('FROM dispatch_line_allocations')) {
        return [[{ reserved_outer: '0.0000', reserved_inner: '0.0000' }]];
      }
      return [[]];
    });
    const readyLine = dispatchLine({
      id: 61,
      item_id: null,
      packaging_group_id: 7,
      fulfillment_type: 'ready_inner_unit',
      quantity: '3.0000'
    });

    await service._private.allocateDispatchLine(
      mockConnection,
      dispatch({ status: 'pending_approval' }),
      readyLine,
      9
    );

    expect(model.createDispatchLineAllocation).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      dispatch_item_id: 61,
      ready_stock_container_id: 900,
      allocation_type: 'ready_stock_container',
      allocated_quantity: '3.0000',
      inventory_quantity: '3.0000',
      unit_cost: '0.9800',
      total_cost: '2.9400',
      status: 'reserved'
    }));
    expect(model.updateDispatchItem).toHaveBeenCalledWith(61, {
      unit_cost: '0.9800'
    }, mockConnection);
  });
});

describe('salesman workspace dispatch scope', () => {
  const workspaceActor = {
    id: 12,
    store_id: 1,
    permissions: ['salesman_workspace.view']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('limits workspace-only dispatch lists to the linked active salesman', async () => {
    model.findSalesmanByUserId.mockResolvedValue({ id: 3, store_id: 1, user_id: 12, status: 'active' });
    model.listDispatchRequests.mockResolvedValue({ rows: [], meta: { total: 0 } });

    await service.listDispatchRequests({ page: 1 }, workspaceActor);

    expect(model.listDispatchRequests).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 1,
      salesman_id: 3,
      page: 1
    }));
  });

  test('does not expose another salesman’s dispatch detail through workspace access', async () => {
    model.findDispatchRequestById.mockResolvedValue(dispatch({ salesman_user_id: 99 }));

    await expect(service.getDispatchRequest(41, workspaceActor)).rejects.toMatchObject({
      statusCode: 404
    });
  });
});
