jest.mock('../src/modules/customers/customers.model', () => ({
  exportCustomers: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({
  exportSalesmen: jest.fn()
}));

const customerModel = require('../src/modules/customers/customers.model');
const locationModel = require('../src/modules/locations/locations.model');
const customerService = require('../src/modules/customers/customers.service');
const locationService = require('../src/modules/locations/locations.service');
const customerSchemas = require('../src/modules/customers/customers.schema');
const locationSchemas = require('../src/modules/locations/locations.schema');

describe('CSV export scope and query contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('customer export replaces a caller supplied store with the signed-in store', async () => {
    customerModel.exportCustomers.mockResolvedValue([]);

    await customerService.exportCustomers({
      dataset: 'invoices',
      store_id: 999,
      date_from: '2026-01-01'
    }, {
      id: 7,
      store_id: 2,
      is_superadmin: false
    });

    expect(customerModel.exportCustomers).toHaveBeenCalledWith({
      dataset: 'invoices',
      store_id: 2,
      date_from: '2026-01-01'
    });
  });

  test('salesman export uses the same scoped store protection', async () => {
    locationModel.exportSalesmen.mockResolvedValue([]);

    await locationService.exportSalesmen({
      dataset: 'revenue',
      salesman_id: 14,
      store_id: 999
    }, {
      id: 8,
      store_id: 3,
      is_superadmin: false
    });

    expect(locationModel.exportSalesmen).toHaveBeenCalledWith({
      dataset: 'revenue',
      salesman_id: 14,
      store_id: 3
    });
  });

  test('a superadmin must explicitly select a store for either export', async () => {
    expect(() => customerService.exportCustomers({ dataset: 'directory' }, {
      id: 1,
      is_superadmin: true
    })).toThrow(expect.objectContaining({ statusCode: 400 }));

    expect(() => locationService.exportSalesmen({ dataset: 'performance' }, {
      id: 1,
      is_superadmin: true
    })).toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  test('export schemas accept declared datasets and reject inverted date ranges', () => {
    expect(customerSchemas.exportSchema.parse({
      query: { dataset: 'debts', date_from: '2026-01-01', date_to: '2026-01-31' }
    }).query.dataset).toBe('debts');

    expect(locationSchemas.salesmanExportSchema.parse({
      query: { dataset: 'delivered_customers', date_from: '2026-02-01', date_to: '2026-02-28' }
    }).query.dataset).toBe('delivered_customers');

    expect(() => customerSchemas.exportSchema.parse({
      query: { date_from: '2026-02-02', date_to: '2026-02-01' }
    })).toThrow();

    expect(() => locationSchemas.salesmanExportSchema.parse({
      query: { dataset: 'unknown' }
    })).toThrow();
  });
});
