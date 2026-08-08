const ApiError = require('../../utils/ApiError');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const locationModel = require('../locations/locations.model');
const model = require('./customers.model');

const MANAGER_PERMISSIONS = [
  'salesmen.manage',
  'pos.create_for_salesman',
  'dispatch.view',
  'dispatch.create',
  'dispatch.approve',
  'dispatch.settle',
  'delivery.release',
  'delivery.dispatch',
  'delivery.record_returns',
  'delivery.closeout',
  'finance.settle_deliveries'
];

function hasPermission(actor = {}, permission) {
  if (actor.is_superadmin) return true;
  const permissions = new Set(actor.permissions || []);
  return permissions.has('*') || permissions.has(permission);
}

function isSalesmanOnly(actor = {}) {
  if (actor.is_superadmin || hasPermission(actor, '*')) return false;
  const canManageOthers = MANAGER_PERMISSIONS.some((permission) => hasPermission(actor, permission));
  return !canManageOthers && (
    hasPermission(actor, 'salesman_workspace.view') || hasPermission(actor, 'pos.create_own')
  );
}

async function getOwnSalesmanId(actor = {}) {
  if (!isSalesmanOnly(actor)) return null;
  const salesman = await locationModel.findSalesmanByUserId(actor.id);
  if (!salesman || salesman.status !== 'active' || Number(salesman.store_id) !== Number(actor.store_id)) {
    throw ApiError.forbidden('An active salesman link is required to access customers');
  }
  return salesman.id;
}

async function scopedCustomerQuery(input, actor = {}) {
  const scoped = scopedQuery(input, actor);
  const salesmanId = await getOwnSalesmanId(actor);
  return salesmanId ? { ...scoped, salesman_id: salesmanId } : scoped;
}

async function getCustomer(id, actor = {}) {
  const customer = await model.findCustomerById(id);
  assertRowInScope(customer, actor, 'Customer not found');
  const salesmanId = await getOwnSalesmanId(actor);
  if (salesmanId && Number(customer.assigned_salesman_id) !== Number(salesmanId)) {
    throw ApiError.notFound('Customer not found');
  }
  return customer;
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
  const salesmanId = await getOwnSalesmanId(actor);
  if (salesmanId) scoped.assigned_salesman_id = salesmanId;
  await validateCustomerRefs(scoped, scoped.store_id);
  return model.createCustomer({ ...scoped, created_by: userId });
}

async function updateCustomer(id, data, actor = {}) {
  const current = await getCustomer(id, actor);
  const { store_id, ...updates } = data;
  const salesmanId = await getOwnSalesmanId(actor);
  if (salesmanId) updates.assigned_salesman_id = salesmanId;
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
  exportCustomers: (query, actor = {}) => scopedCustomerQuery(query, actor).then((scoped) => model.exportCustomers(scoped)),
  getCustomer,
  listCustomers: (query, actor = {}) => scopedCustomerQuery(query, actor).then((scoped) => model.listCustomers(scoped)),
  updateCustomer
};
