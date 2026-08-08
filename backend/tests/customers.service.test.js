jest.mock('../src/modules/locations/locations.model', () => ({
  findSalesmanByUserId: jest.fn(),
  findSalesmanById: jest.fn()
}));

jest.mock('../src/modules/customers/customers.model', () => ({
  findCustomerById: jest.fn(),
  listCustomers: jest.fn(),
  updateCustomer: jest.fn()
}));

const locationModel = require('../src/modules/locations/locations.model');
const model = require('../src/modules/customers/customers.model');
const service = require('../src/modules/customers/customers.service');

const salesmanActor = {
  id: 12,
  store_id: 1,
  permissions: ['customers.view', 'salesman_workspace.view', 'pos.create_own']
};

describe('customer salesman scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationModel.findSalesmanByUserId.mockResolvedValue({
      id: 3,
      store_id: 1,
      user_id: 12,
      status: 'active'
    });
    locationModel.findSalesmanById.mockResolvedValue({
      id: 3,
      store_id: 1,
      status: 'active'
    });
    model.listCustomers.mockResolvedValue({ rows: [], meta: { total: 0 } });
  });

  test('limits the customer directory to the linked salesman', async () => {
    await service.listCustomers({ salesman_id: 99, page: 1 }, salesmanActor);

    expect(model.listCustomers).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 1,
      salesman_id: 3,
      page: 1
    }));
  });

  test('does not expose another salesman customer detail', async () => {
    model.findCustomerById.mockResolvedValue({
      id: 41,
      store_id: 1,
      assigned_salesman_id: 99
    });

    await expect(service.getCustomer(41, salesmanActor)).rejects.toMatchObject({
      statusCode: 404
    });
  });

  test('keeps manager customer filters unrestricted', async () => {
    const manager = { id: 9, store_id: 1, permissions: ['customers.view', 'dispatch.view'] };

    await service.listCustomers({ salesman_id: 99, page: 1 }, manager);

    expect(locationModel.findSalesmanByUserId).not.toHaveBeenCalled();
    expect(model.listCustomers).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 1,
      salesman_id: 99,
      page: 1
    }));
  });

  test('does not allow a salesman update to reassign a customer', async () => {
    model.findCustomerById.mockResolvedValue({
      id: 41,
      store_id: 1,
      assigned_salesman_id: 3,
      name: 'Assigned customer'
    });

    await service.updateCustomer(41, { name: 'Updated', assigned_salesman_id: 99 }, salesmanActor);

    expect(model.updateCustomer).toHaveBeenCalledWith(41, {
      name: 'Updated',
      assigned_salesman_id: 3
    });
  });
});
