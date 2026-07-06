jest.mock('../src/modules/dispatch/dispatch.model', () => ({
  findDispatchCustomerById: jest.fn(),
  findDispatchRequestById: jest.fn(),
  createDispatchItem: jest.fn(),
  recalculateDispatchTotals: jest.fn()
}));

jest.mock('../src/modules/inventory/inventory.model', () => ({
  findVariantById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({}));

jest.mock('../src/modules/locations/locations.model', () => ({}));
jest.mock('../src/modules/customers/customers.model', () => ({}));
jest.mock('../src/modules/payments/payments.model', () => ({}));
jest.mock('../src/modules/accounting/accounting.model', () => ({}));

jest.mock('../src/services/storeConfig.service', () => ({
  getStoreVatSettings: jest.fn()
}));

jest.mock('../src/modules/packaging/packaging.model', () => ({
  findAssignmentById: jest.fn(),
  getAssignmentAllocatedQuantity: jest.fn()
}));

const model = require('../src/modules/dispatch/dispatch.model');
const inventoryModel = require('../src/modules/inventory/inventory.model');
const storeConfigService = require('../src/services/storeConfig.service');
const packagingModel = require('../src/modules/packaging/packaging.model');
const service = require('../src/modules/dispatch/dispatch.service');

describe('dispatch service packaging batches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    model.findDispatchCustomerById.mockResolvedValue({
      id: 31,
      store_id: 1,
      dispatch_request_id: 41
    });
    model.findDispatchRequestById.mockResolvedValue({
      id: 41,
      store_id: 1,
      status: 'draft',
      warehouse_id: 2
    });
    inventoryModel.findVariantById.mockResolvedValue({
      id: 9,
      store_id: 1,
      status: 'active',
      tracking_type: 'stocked',
      cost: '3.5000'
    });
    storeConfigService.getStoreVatSettings.mockResolvedValue({ enabled: false, rate: 0 });
    model.createDispatchItem.mockImplementation(async (payload) => ({ id: 51, ...payload }));
    model.recalculateDispatchTotals.mockResolvedValue(undefined);
  });

  test('adds items from a batched packaging assignment with the batch cost', async () => {
    packagingModel.findAssignmentById.mockResolvedValue({
      id: 11,
      store_id: 1,
      warehouse_id: 2,
      status: 'batched',
      output_item_variant_id: 9,
      charcoal_variant_id: 8,
      produced_quantity: '100.0000',
      calculation_json: JSON.stringify({
        cost_per_primary_container: '9.5000'
      })
    });
    packagingModel.getAssignmentAllocatedQuantity.mockResolvedValue('20.0000');

    const item = await service.addItem(31, {
      packaging_assignment_id: 11,
      item_variant_id: 9,
      quantity: 10,
      unit_price: 5
    }, { store_id: 1 });

    expect(item.packaging_assignment_id).toBe(11);
    expect(model.createDispatchItem).toHaveBeenCalledWith(expect.objectContaining({
      packaging_assignment_id: 11,
      item_variant_id: 9,
      quantity: 10,
      unit_cost: '9.5000'
    }));
  });

  test('defaults the dispatched variant from the selected packaging assignment', async () => {
    packagingModel.findAssignmentById.mockResolvedValue({
      id: 11,
      store_id: 1,
      warehouse_id: 2,
      status: 'batched',
      output_item_variant_id: 9,
      charcoal_variant_id: 8,
      produced_quantity: '100.0000',
      calculation_json: JSON.stringify({
        cost_per_primary_container: '9.5000'
      })
    });
    packagingModel.getAssignmentAllocatedQuantity.mockResolvedValue('0.0000');

    const item = await service.addItem(31, {
      packaging_assignment_id: 11,
      quantity: 5,
      unit_price: 7
    }, { store_id: 1 });

    expect(item.item_variant_id).toBe(9);
    expect(inventoryModel.findVariantById).toHaveBeenCalledWith(9);
  });
});
