const ApiError = require('../../utils/ApiError');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const locationModel = require('../locations/locations.model');
const model = require('./customers.model');

async function getCustomer(id, actor = {}) {
  const customer = await model.findCustomerById(id);

  return assertRowInScope(customer, actor, 'Customer not found');
}

async function validateCustomerRefs(data, storeId) {
  if (data.location_id) {
    const location = await locationModel.findLocationById(data.location_id);

    if (!location) throw ApiError.badRequest('Validation failed', [{ field: 'location_id', message: 'Location not found' }]);
    assertSameStore(location, storeId, 'location_id', 'Location does not belong to this store');
  }

  if (data.sublocation_id) {
    const sublocation = await locationModel.findSublocationById(data.sublocation_id);

    if (!sublocation) throw ApiError.badRequest('Validation failed', [{ field: 'sublocation_id', message: 'Sublocation not found' }]);
    assertSameStore(sublocation, storeId, 'sublocation_id', 'Sublocation does not belong to this store');

    if (data.location_id && Number(sublocation.location_id) !== Number(data.location_id)) {
      throw ApiError.badRequest('Validation failed', [{ field: 'sublocation_id', message: 'Sublocation must belong to location' }]);
    }
  }

  if (data.assigned_salesman_id) {
    const salesman = await locationModel.findSalesmanById(data.assigned_salesman_id);

    if (!salesman) throw ApiError.badRequest('Validation failed', [{ field: 'assigned_salesman_id', message: 'Salesman not found' }]);
    assertSameStore(salesman, storeId, 'assigned_salesman_id', 'Salesman does not belong to this store');
    if (salesman.status !== 'active') {
      throw ApiError.badRequest('Validation failed', [{ field: 'assigned_salesman_id', message: 'Salesman must be active' }]);
    }

    if (data.sublocation_id) {
      const assignment = await locationModel.findActiveSalesmanSublocation(
        data.assigned_salesman_id,
        data.sublocation_id
      );

      if (!assignment) {
        throw ApiError.badRequest('Validation failed', [
          { field: 'assigned_salesman_id', message: 'Salesman is not assigned to this sublocation' }
        ]);
      }
    }
  }
}

async function createCustomer(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  await validateCustomerRefs(scoped, scoped.store_id);
  return model.createCustomer({ ...scoped, created_by: userId });
}

async function updateCustomer(id, data, actor = {}) {
  const current = await getCustomer(id, actor);
  const { store_id, ...updates } = data;
  await validateCustomerRefs({
    ...current,
    ...updates
  }, current.store_id);
  return model.updateCustomer(id, updates);
}

async function deleteCustomer(id, actor = {}) {
  await getCustomer(id, actor);
  const historyCount = await model.countCustomerHistory(id);

  if (historyCount > 0) {
    throw ApiError.conflict('Customer cannot be deleted because it has dispatch/payment/debt history');
  }

  await model.deactivateCustomer(id);
}

module.exports = {
  createCustomer,
  deleteCustomer,
  exportCustomers: (query, actor = {}) => model.exportCustomers(scopedQuery(query, actor)),
  getCustomer,
  listCustomers: (query, actor = {}) => model.listCustomers(scopedQuery(query, actor)),
  updateCustomer
};
