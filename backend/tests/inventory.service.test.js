jest.mock('../src/modules/inventory/inventory.model', () => ({
  createItem: jest.fn(),
  findCategoryById: jest.fn(),
  findItemById: jest.fn(),
  findUnitById: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({
  findLocationById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({
  adjustStock: jest.fn()
}));

const inventoryModel = require('../src/modules/inventory/inventory.model');
const service = require('../src/modules/inventory/inventory.service');

describe('inventory service packaging items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    inventoryModel.findCategoryById.mockResolvedValue({ id: 1, store_id: 1 });
  });

  test('requires packaging materials to use pc as their stock unit', async () => {
    inventoryModel.findUnitById.mockResolvedValue({
      id: 2,
      store_id: 1,
      symbol: 'kg',
      unit_type: 'weight'
    });

    await expect(service.createItem({
      category_id: 1,
      base_unit_id: 2,
      name: '400g bag',
      code: 'BAG-400G',
      item_type: 'packaging',
      tracking_type: 'stocked'
    }, 5, { store_id: 1 })).rejects.toMatchObject({
      statusCode: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'base_unit_id',
          message: 'Packaging materials must use pc as their stock unit'
        })
      ])
    });

    expect(inventoryModel.createItem).not.toHaveBeenCalled();
  });
});
