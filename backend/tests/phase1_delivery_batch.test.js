const mockConnection = { execute: jest.fn() };

jest.mock('../src/modules/dispatch/dispatch.model', () => ({
  findDispatchRequestById: jest.fn(),
  findSettlementById: jest.fn(),
  findDispatchCustomerById: jest.fn(),
  findDispatchItemById: jest.fn(),
  getDispatchCustomers: jest.fn(),
  getDispatchItems: jest.fn(),
  getInvoicesForDispatch: jest.fn(),
  getDocumentChecklist: jest.fn(),
  getDispatchPosOrderLinks: jest.fn().mockResolvedValue([]),
  listDispatchRequests: jest.fn(),
  findSalesmanByUserId: jest.fn(),
  createTargetCreditRecord: jest.fn(),
  listTargetCreditsByDispatch: jest.fn(),
  lockDispatchRequest: jest.fn(),
  updateDispatchRequest: jest.fn(),
  updateDispatchCustomer: jest.fn(),
  updateDispatchCustomersFulfillmentStatus: jest.fn(),
  deleteDispatchItem: jest.fn(),
  voidInvoicesForDispatchRevision: jest.fn(),
  createSettlement: jest.fn()
}));

jest.mock('../src/modules/pos/pos.model', () => ({
  findSalesmanByUserId: jest.fn(),
  findSalesmanById: jest.fn(),
  findWarehouseById: jest.fn()
}));

jest.mock('../src/modules/accounting/accounting.model', () => ({
  createFinancialTransaction: jest.fn(),
  createSalesmanBalance: jest.fn()
}));

jest.mock('../src/modules/payments/payments.model', () => ({
  createPayment: jest.fn(),
  createReceipt: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback(mockConnection))
}));

const dispatchModel = require('../src/modules/dispatch/dispatch.model');
const accountingModel = require('../src/modules/accounting/accounting.model');
const paymentsModel = require('../src/modules/payments/payments.model');
const posModel = require('../src/modules/pos/pos.model');
const dispatchService = require('../src/modules/dispatch/dispatch.service');
const posService = require('../src/modules/pos/pos.service');

describe('Phase 1: Delivery Batch Domain & Compatibility Foundation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Mapping & Capabilities Generation', () => {
    test('maps legacy status values to lifecycle_status and generates capabilities for salesman owner', async () => {
      const mockDispatch = {
        id: 101,
        store_id: 1,
        dispatch_number: 'DISP-101',
        salesman_id: 5,
        salesman_name: 'John Salesman',
        salesman_user_id: 20,
        warehouse_id: 2,
        warehouse_name: 'Main Warehouse',
        request_date: '2026-08-01',
        status: 'draft',
        revision: 1
      };
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);
      dispatchModel.getDispatchCustomers.mockResolvedValue([
        { id: 1, dispatch_request_id: 101, customer_id: 50, customer_name: 'Acme Store' }
      ]);
      dispatchModel.getDispatchItems.mockResolvedValue([]);
      dispatchModel.getInvoicesForDispatch.mockResolvedValue([]);
      dispatchModel.getDocumentChecklist.mockResolvedValue({});

      const salesmanActor = { id: 20, store_id: 1, permissions: ['pos.create_own'] };
      const batch = await dispatchService.getDispatchRequest(101, salesmanActor);

      expect(batch.batch_id).toBe(101);
      expect(batch.origin).toBe('direct');
      expect(batch.lifecycle_status).toBe('pending');
      expect(batch.assigned_salesman).toEqual({ id: 5, name: 'John Salesman', user_id: 20 });
      expect(batch.warehouse).toEqual({ id: 2, name: 'Main Warehouse' });
      expect(batch.customers[0].fulfillment_status).toBe('pending');
      expect(batch.capabilities).toEqual({
        can_edit: true,
        can_submit: true,
        can_rework: false,
        can_cancel: true,
        can_release: false,
        can_dispatch: false,
        can_record_returns: false,
        can_closeout: false,
        can_settle: false
      });
    });

    test('grants release capability to authorized delivery role on pending batch', async () => {
      const mockDispatch = {
        id: 102,
        store_id: 1,
        dispatch_number: 'DISP-102',
        salesman_id: 5,
        salesman_name: 'John Salesman',
        salesman_user_id: 20,
        warehouse_id: 2,
        warehouse_name: 'Main Warehouse',
        request_date: '2026-08-01',
        status: 'pending_approval',
        revision: 1
      };
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);
      dispatchModel.getDispatchCustomers.mockResolvedValue([]);
      dispatchModel.getDispatchItems.mockResolvedValue([]);
      dispatchModel.getInvoicesForDispatch.mockResolvedValue([]);
      dispatchModel.getDocumentChecklist.mockResolvedValue({});

      const managerActor = { id: 99, store_id: 1, permissions: ['delivery.release', 'pos.manage_pending'] };
      const batch = await dispatchService.getDispatchRequest(102, managerActor);

      expect(batch.lifecycle_status).toBe('pending');
      expect(batch.capabilities.can_release).toBe(true);
      expect(batch.capabilities.can_edit).toBe(false);
      expect(batch.capabilities.can_settle).toBe(false);
    });

    test('grants finance settlement capabilities only to finance role on closeout pending batch', async () => {
      const mockDispatch = {
        id: 103,
        store_id: 1,
        dispatch_number: 'DISP-103',
        salesman_id: 5,
        salesman_name: 'John Salesman',
        salesman_user_id: 20,
        warehouse_id: 2,
        warehouse_name: 'Main Warehouse',
        request_date: '2026-08-01',
        status: 'partially_settled',
        revision: 1
      };
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);
      dispatchModel.getDispatchCustomers.mockResolvedValue([]);
      dispatchModel.getDispatchItems.mockResolvedValue([]);
      dispatchModel.getInvoicesForDispatch.mockResolvedValue([]);
      dispatchModel.getDocumentChecklist.mockResolvedValue({});

      const financeActor = { id: 88, store_id: 1, permissions: ['finance.settle_deliveries'] };
      const batch = await dispatchService.getDispatchRequest(103, financeActor);

      expect(batch.lifecycle_status).toBe('closeout_pending');
      expect(batch.capabilities.can_settle).toBe(true);
      expect(batch.capabilities.can_edit).toBe(false);

      const salesmanActor = { id: 20, store_id: 1, permissions: ['pos.create_own'] };
      const salesmanBatch = await dispatchService.getDispatchRequest(103, salesmanActor);
      expect(salesmanBatch.capabilities.can_settle).toBe(false);
    });
  });

  describe('Salesman Request Context & Permissions', () => {
    test('salesman with pos.create_own can create for own salesman ID', async () => {
      posModel.findSalesmanByUserId.mockResolvedValue({ id: 5, store_id: 1, user_id: 20, status: 'active' });
      const actor = { id: 20, store_id: 1, permissions: ['pos.create_own'] };

      const result = await posService.getLinkedSalesman(actor, { salesman_id: 5 });
      expect(result.salesman.id).toBe(5);
    });

    test('blocks salesman with only pos.create_own from creating request for another salesman', async () => {
      posModel.findSalesmanByUserId.mockResolvedValue({ id: 5, store_id: 1, user_id: 20, status: 'active' });
      const actor = { id: 20, store_id: 1, permissions: ['pos.create_own'] };

      await expect(posService.getLinkedSalesman(actor, { salesman_id: 99 })).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('another salesman')
      });
    });

    test('allows manager with pos.create_for_salesman to assign request to another salesman', async () => {
      posModel.findSalesmanById.mockResolvedValue({ id: 99, store_id: 1, status: 'active' });
      const managerActor = { id: 10, store_id: 1, permissions: ['pos.create_for_salesman'] };

      const result = await posService.getLinkedSalesman(managerActor, { salesman_id: 99 });
      expect(result.salesman.id).toBe(99);
    });
  });

  describe('Cross-Salesman Access Control', () => {
    test('blocks ordinary salesman with pos.create_own from viewing another salesman batch', async () => {
      const mockDispatch = {
        id: 301,
        store_id: 1,
        dispatch_number: 'DISP-301',
        salesman_id: 99,
        salesman_user_id: 88,
        status: 'draft'
      };
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);

      const anotherSalesmanActor = { id: 20, store_id: 1, permissions: ['pos.create_own'] };

      await expect(dispatchService.getDispatchRequest(301, anotherSalesmanActor)).rejects.toMatchObject({
        statusCode: 404,
        message: expect.stringContaining('not found')
      });
    });

    test('blocks ordinary salesman with pos.create_own from editing another salesman batch', async () => {
      const mockDispatch = {
        id: 302,
        store_id: 1,
        dispatch_number: 'DISP-302',
        salesman_id: 99,
        salesman_user_id: 88,
        status: 'draft'
      };
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);

      const anotherSalesmanActor = { id: 20, store_id: 1, permissions: ['pos.create_own'] };

      await expect(dispatchService.updateDispatchRequest(302, { notes: 'Hack' }, anotherSalesmanActor)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('modify another salesman')
      });
    });

    test('allows manager with pos.manage_pending to view and edit another salesman batch', async () => {
      const mockDispatch = {
        id: 303,
        store_id: 1,
        dispatch_number: 'DISP-303',
        salesman_id: 99,
        salesman_user_id: 88,
        warehouse_id: 2,
        status: 'draft'
      };
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);
      dispatchModel.getDispatchCustomers.mockResolvedValue([]);
      dispatchModel.getDispatchItems.mockResolvedValue([]);
      dispatchModel.getInvoicesForDispatch.mockResolvedValue([]);
      dispatchModel.getDocumentChecklist.mockResolvedValue({});
      dispatchModel.getDispatchPosOrderLinks.mockResolvedValue([]);
      dispatchModel.updateDispatchRequest.mockResolvedValue({ ...mockDispatch, notes: 'Updated by manager' });

      const managerActor = { id: 10, store_id: 1, permissions: ['pos.manage_pending'] };

      const batch = await dispatchService.getDispatchRequest(303, managerActor);
      expect(batch.id).toBe(303);

      const updated = await dispatchService.updateDispatchRequest(303, { notes: 'Updated by manager' }, managerActor);
      expect(updated.notes).toBe('Updated by manager');
    });

    test('blocks ordinary salesman with pos.create_own from nested mutations on another salesman batch', async () => {
      const mockDispatch = { id: 304, store_id: 1, salesman_id: 99, salesman_user_id: 88, status: 'draft' };
      const mockCustomer = { id: 401, store_id: 1, dispatch_request_id: 304, salesman_id: 99, salesman_user_id: 88, dispatch_status: 'draft' };
      const mockItem = { id: 501, store_id: 1, dispatch_request_id: 304, salesman_id: 99, salesman_user_id: 88, dispatch_status: 'draft' };

      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);
      dispatchModel.findDispatchCustomerById.mockResolvedValue(mockCustomer);
      dispatchModel.findDispatchItemById.mockResolvedValue(mockItem);

      const unauthorizedSalesman = { id: 20, store_id: 1, permissions: ['pos.create_own'] };

      await expect(dispatchService.addCustomer(304, { customer_id: 10 }, unauthorizedSalesman)).rejects.toMatchObject({
        statusCode: 403
      });

      await expect(dispatchService.addItem(401, { sale_catalog_entry_id: 1, quantity: 1 }, unauthorizedSalesman)).rejects.toMatchObject({
        statusCode: 403
      });

      await expect(dispatchService.updateItem(501, { quantity: 2 }, unauthorizedSalesman)).rejects.toMatchObject({
        statusCode: 403
      });

      await expect(dispatchService.deleteItem(501, unauthorizedSalesman)).rejects.toMatchObject({
        statusCode: 403
      });
    });
  });

  describe('Customer Fulfillment Status Transitions', () => {
    test('updates customer fulfillment status on cancel and rework', async () => {
      const mockDispatch = { id: 401, store_id: 1, status: 'pending_approval', revision: 1, salesman_user_id: 20 };
      dispatchModel.lockDispatchRequest = jest.fn().mockResolvedValue(mockDispatch);
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);
      dispatchModel.getDispatchCustomers.mockResolvedValue([]);
      dispatchModel.getDispatchItems.mockResolvedValue([]);
      dispatchModel.getInvoicesForDispatch.mockResolvedValue([]);
      dispatchModel.getDocumentChecklist.mockResolvedValue({});

      const managerActor = { id: 99, store_id: 1, permissions: ['delivery.release', 'delivery.dispatch', 'pos.manage_pending'] };

      await dispatchService.cancelDispatch(401, managerActor);
      expect(dispatchModel.updateDispatchCustomersFulfillmentStatus).toHaveBeenCalledWith(401, 'cancelled', mockConnection);

      mockDispatch.status = 'pending_approval';
      await dispatchService.reworkDispatch(401, { reason: 'Test' }, managerActor);
      expect(dispatchModel.updateDispatchCustomersFulfillmentStatus).toHaveBeenCalledWith(401, 'pending', mockConnection);
    });

    test('transitions lifecycle from out_for_delivery to closeout_pending on createCloseout, and to settled on postSettlement', async () => {
      const mockDispatch = {
        id: 501,
        store_id: 1,
        salesman_id: 5,
        salesman_user_id: 20,
        warehouse_id: 2,
        status: 'delivery',
        lifecycle_status: 'out_for_delivery'
      };
      dispatchModel.findDispatchRequestById.mockResolvedValue(mockDispatch);
      dispatchModel.lockDispatchRequest.mockResolvedValue(mockDispatch);
      dispatchModel.getDispatchCustomers.mockResolvedValue([
        { id: 10, dispatch_request_id: 501, customer_id: 50, customer_total_amount: '100.0000', fulfillment_status: 'out_for_delivery' }
      ]);
      mockConnection.execute.mockResolvedValue([[]]);
      dispatchModel.createSettlement.mockResolvedValue({ id: 80, dispatch_request_id: 501 });

      const salesmanActor = { id: 20, store_id: 1, permissions: ['pos.create_own'] };
      await expect(dispatchService.createCloseout(501, { customers: [{ dispatch_customer_id: 10, collected_amount: 100 }] }, 20, salesmanActor)).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining('permission')
      });

      const adminActor = { id: 99, store_id: 1, permissions: ['dispatch.settle'] };
      dispatchModel.getDocumentChecklist.mockResolvedValue({ delivery_documents_generated: true });
      await dispatchService.createCloseout(501, { customers: [{ dispatch_customer_id: 10, collected_amount: 100 }] }, 99, adminActor);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE dispatch_requests SET lifecycle_status = 'closeout_pending'"),
        [501]
      );

      dispatchModel.findSettlementById
        .mockResolvedValueOnce({ id: 80, store_id: 1, dispatch_request_id: 501, settlement_number: 'SET-80', settlement_date: '2026-08-01', status: 'draft' })
        .mockResolvedValueOnce({ id: 80, status: 'posted' });
      dispatchModel.findDispatchCustomerById.mockResolvedValue({ id: 10, fulfillment_status: 'out_for_delivery' });
      mockConnection.execute.mockImplementation(async (sql) => {
        if (sql.includes('FROM dispatch_settlement_customers')) {
          return [[{
            dispatch_customer_id: 10,
            customer_id: 50,
            expected_amount: '100.0000',
            collected_amount: '95.0000',
            debt_amount: '5.0000',
            settlement_status: 'partial_debt'
          }]];
        }
        return [{}];
      });
      paymentsModel.createPayment.mockResolvedValue(601);
      paymentsModel.createReceipt.mockResolvedValue(701);

      await dispatchService.postSettlement(80, { cash_account_id: 6, settlement_date: '2026-08-01' }, 99, adminActor);

      expect(paymentsModel.createPayment).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
        customer_id: 50,
        cash_account_id: 6,
        amount: '95.0000',
        collected_by_salesman_id: 5
      }));
      expect(paymentsModel.createReceipt).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
        customer_id: 50,
        dispatch_request_id: 501,
        dispatch_customer_id: 10,
        customer_payment_id: 601,
        total_amount: '100.0000',
        paid_amount: '95.0000',
        remaining_amount: '5.0000',
        receipt_type: 'sale'
      }));
      expect(accountingModel.createFinancialTransaction).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
        cash_account_id: 6,
        amount: '95.0000'
      }));
    });
  });

  describe('Target Credit Ledger Foundation', () => {
    test('target credit helper creates a migration-safe seam record', async () => {
      dispatchModel.createTargetCreditRecord.mockResolvedValue(1);
      dispatchModel.listTargetCreditsByDispatch.mockResolvedValue([
        {
          id: 1,
          store_id: 1,
          dispatch_request_id: 101,
          salesman_id: 5,
          customer_id: 50,
          eligible_amount: '150.0000',
          status: 'pending'
        }
      ]);

      const recordId = await dispatchModel.createTargetCreditRecord({
        store_id: 1,
        dispatch_request_id: 101,
        dispatch_customer_id: 1,
        salesman_id: 5,
        customer_id: 50,
        eligible_amount: 150,
        status: 'pending'
      });
      expect(recordId).toBe(1);

      const records = await dispatchModel.listTargetCreditsByDispatch(101);
      expect(records).toHaveLength(1);
      expect(records[0].eligible_amount).toBe('150.0000');
    });
  });
});
