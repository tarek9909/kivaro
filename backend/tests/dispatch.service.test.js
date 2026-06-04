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

jest.mock('../src/modules/settings/settings.service', () => ({
  getVatSettings: jest.fn()
}));

jest.mock('../src/modules/packaging/packaging.model', () => ({
  findAssignmentById: jest.fn(),
  getAssignmentAllocatedQuantity: jest.fn()
}));

const model = require('../src/modules/dispatch/dispatch.model');
const inventoryModel = require('../src/modules/inventory/inventory.model');
const settingsService = require('../src/modules/settings/settings.service');
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
    settingsService.getVatSettings.mockResolvedValue({ enabled: false, rate: 0 });
    model.createDispatchItem.mockImplementation(async (payload) => ({ id: 51, ...payload }));
    model.recalculateDispatchTotals.mockResolvedValue(undefined);
  });

  test('adds items from a consumed packaging batch without requiring an output variant match', async () => {
    packagingModel.findAssignmentById.mockResolvedValue({
      id: 11,
      store_id: 1,
      warehouse_id: 2,
      status: 'consumed',
      output_item_variant_id: null,
      produced_quantity: '100.0000'
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
      quantity: 10
    }));
  });
});
