const ApiError = require('../../utils/ApiError');
const { decimal } = require('../../utils/money');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const model = require('./locations.model');
const userService = require('../users/users.service');

async function mustFind(method, id, message, actor = {}) {
  const row = await method(id);

  return assertRowInScope(row, actor, message);
}

async function createSublocation(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const location = await mustFind(model.findLocationById, scoped.location_id, 'Location not found', actor);
  assertSameStore(location, scoped.store_id, 'location_id', 'Location does not belong to this store');
  return model.createSublocation({ ...scoped, created_by: userId });
}

async function createSalesman(data, userId, actor = {}) {
  const { create_login_user, password, ...salesmanData } = data;
  const scoped = scopedData(salesmanData, actor);
  const linkedUserId = scoped.user_id || null;

  if (create_login_user) {
    if (linkedUserId) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'create_login_user', message: 'Salesman is already linked to a user account' }
      ]);
    }

    return withTransaction(async (connection) => {
      const user = await userService.createSalesmanUser({
        store_id: scoped.store_id,
        full_name: scoped.full_name,
        phone: scoped.phone,
        email: scoped.email,
        password,
        status: scoped.status
      }, actor, { connection });

      return model.createSalesman({
        ...scoped,
        user_id: user.id
      }, connection);
    });
  }

  return model.createSalesman({
    ...scoped,
    user_id: linkedUserId
  });
}

async function updateSublocation(id, data, actor = {}) {
  const current = await mustFind(model.findSublocationById, id, 'Sublocation not found', actor);
  const { store_id, ...updates } = data;

  if (updates.location_id) {
    const location = await mustFind(model.findLocationById, updates.location_id, 'Location not found', actor);
    assertSameStore(location, current.store_id, 'location_id', 'Location does not belong to this store');
  }

  return model.updateSublocation(id, updates);
}

async function assignSalesmanSublocation(salesmanId, data, actor = {}) {
  const salesman = await mustFind(model.findSalesmanById, salesmanId, 'Salesman not found', actor);
  const sublocation = await mustFind(model.findSublocationById, data.sublocation_id, 'Sublocation not found', actor);
  assertSameStore(sublocation, salesman.store_id, 'sublocation_id', 'Sublocation does not belong to this store');
  const existing = await model.findActiveSalesmanSublocation(salesmanId, data.sublocation_id);

  if (existing) {
    throw ApiError.conflict('Salesman is already assigned to this sublocation');
  }

  return model.assignSalesmanSublocation({
    salesman_id: salesmanId,
    sublocation_id: data.sublocation_id,
    assigned_at: data.assigned_at,
    status: 'active'
  });
}

async function replaceSalesmanSublocations(salesmanId, data, actor = {}) {
  const uniqueSublocationIds = [...new Set(data.sublocation_ids.map(Number))];
  const assignmentDate = data.assigned_at || new Date().toISOString().slice(0, 10);

  return withTransaction(async (connection) => {
    const salesman = await model.findSalesmanById(salesmanId, connection);
    assertRowInScope(salesman, actor, 'Salesman not found');
    if (salesman.status !== 'active') {
      throw ApiError.badRequest('Validation failed', [
        { field: 'salesman_id', message: 'Salesman must be active' }
      ]);
    }

    const sublocations = await model.lockSublocationsByIds(connection, uniqueSublocationIds);
    if (sublocations.length !== uniqueSublocationIds.length) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'sublocation_ids', message: 'One or more sublocations were not found' }
      ]);
    }
    for (const sublocation of sublocations) {
      assertSameStore(sublocation, salesman.store_id, 'sublocation_ids', 'Sublocation does not belong to this store');
      if (sublocation.status !== 'active') {
        throw ApiError.badRequest('Validation failed', [
          { field: 'sublocation_ids', message: 'Only active sublocations can be assigned' }
        ]);
      }
    }

    const changes = await model.replaceActiveSalesmanSublocations(
      connection,
      salesmanId,
      uniqueSublocationIds,
      assignmentDate
    );
    return {
      ...changes,
      assignments: await model.listSalesmanSublocations(salesmanId, { status: 'active' })
    };
  });
}

function addMonthsClamped(date, months) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
  if (next.getUTCDate() !== date.getUTCDate()) {
    next.setUTCDate(0);
  }
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeDateInput(value) {
  if (value instanceof Date) {
    return formatDate(value);
  }
  return String(value).slice(0, 10);
}

function calculatePeriodEnd(targetPeriod, periodStart) {
  if (!periodStart) {
    return periodStart;
  }

  const start = new Date(`${normalizeDateInput(periodStart)}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return periodStart;
  }

  const end = new Date(start);
  if (targetPeriod === 'weekly') {
    end.setUTCDate(end.getUTCDate() + 6);
  } else if (targetPeriod === 'monthly') {
    const next = addMonthsClamped(start, 1);
    next.setUTCDate(next.getUTCDate() - 1);
    return formatDate(next);
  } else if (targetPeriod === 'quarterly') {
    const next = addMonthsClamped(start, 3);
    next.setUTCDate(next.getUTCDate() - 1);
    return formatDate(next);
  } else if (targetPeriod === 'yearly') {
    const next = addMonthsClamped(start, 12);
    next.setUTCDate(next.getUTCDate() - 1);
    return formatDate(next);
  }

  return formatDate(end);
}

function withCalculatedTargetEnd(data, current = {}) {
  const targetPeriod = data.target_period || current.target_period || 'monthly';
  const periodStart = data.period_start || current.period_start;
  if (!periodStart) {
    return data;
  }

  return {
    ...data,
    period_end: calculatePeriodEnd(targetPeriod, periodStart)
  };
}

async function createLocationTarget(data, userId, actor = {}) {
  const scoped = scopedData(withCalculatedTargetEnd(data), actor);
  const location = await mustFind(model.findLocationById, scoped.location_id, 'Location not found', actor);
  assertSameStore(location, scoped.store_id, 'location_id', 'Location does not belong to this store');
  return model.createLocationTarget({ ...scoped, created_by: userId });
}

async function updateLocationTarget(id, data, actor = {}) {
  const target = await mustFind(model.findLocationTargetById, id, 'Location target not found', actor);

  if (target.status === 'closed') {
    throw ApiError.conflict('Closed targets cannot be modified');
  }

  const calculated = withCalculatedTargetEnd(data, target);
  const { store_id, location_id, ...updates } = calculated;
  return model.updateLocationTarget(id, updates);
}

async function createSublocationTarget(locationTargetId, data, actor = {}) {
  const locationTarget = await mustFind(
    model.findLocationTargetById,
    locationTargetId,
    'Location target not found',
    actor
  );
  const sublocation = await mustFind(
    model.findSublocationById,
    data.sublocation_id,
    'Sublocation not found',
    actor
  );
  assertSameStore(sublocation, locationTarget.store_id, 'sublocation_id', 'Sublocation does not belong to this store');

  if (Number(sublocation.location_id) !== Number(locationTarget.location_id)) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'sublocation_id',
        message: 'Sublocation must belong to the target location'
      }
    ]);
  }

  const currentTotal = await model.sumSublocationTargets(locationTargetId);
  const nextTotal = decimal(currentTotal).plus(data.target_amount);

  if (nextTotal.gt(locationTarget.target_amount)) {
    throw ApiError.conflict('Sublocation targets cannot exceed location target amount');
  }

  return model.createSublocationTarget({
    store_id: locationTarget.store_id,
    location_target_id: locationTargetId,
    sublocation_id: data.sublocation_id,
    target_amount: data.target_amount,
    status: data.status || 'draft'
  });
}

async function generateSalesmanTargets(sublocationTargetId, actor = {}) {
  const sublocationTarget = await mustFind(
    model.findSublocationTargetById,
    sublocationTargetId,
    'Sublocation target not found',
    actor
  );

  if (sublocationTarget.status === 'closed') {
    throw ApiError.conflict('Closed targets cannot be regenerated');
  }

  const locationTarget = await mustFind(
    model.findLocationTargetById,
    sublocationTarget.location_target_id,
    'Location target not found',
    actor
  );
  const allocatedTotal = await model.sumSublocationTargets(sublocationTarget.location_target_id);
  if (!decimal(allocatedTotal).eq(locationTarget.target_amount)) {
    throw ApiError.conflict('Salesman targets can only be generated after sublocation targets fully allocate the location target');
  }

  const assignments = await model.activeAssignmentsBySublocation(
    sublocationTarget.sublocation_id
  );

  if (assignments.length === 0) {
    throw ApiError.conflict('Cannot generate salesman targets without active salesman assignments');
  }

  await withTransaction(async (connection) => {
    await model.reconcileSalesmanTargets(
      connection,
      sublocationTargetId,
      assignments,
      Number(sublocationTarget.target_amount),
      sublocationTarget.store_id
    );
  });

  return model.getSalesmanTargets(sublocationTargetId);
}

module.exports = {
  assignSalesmanSublocation,
  createLocation: (data, userId, actor = {}) => model.createLocation({ ...scopedData(data, actor), created_by: userId }),
  createLocationTarget,
  createSalesman,
  createSublocation,
  createSublocationTarget,
  deleteLocation: async (id, actor = {}) => { await mustFind(model.findLocationById, id, 'Location not found', actor); await model.deactivateLocation(id); },
  deleteSalesman: async (id, actor = {}) => { await mustFind(model.findSalesmanById, id, 'Salesman not found', actor); await model.deactivateSalesman(id); },
  deleteSublocation: async (id, actor = {}) => { await mustFind(model.findSublocationById, id, 'Sublocation not found', actor); await model.deactivateSublocation(id); },
  exportSalesmen: (query, actor = {}) => model.exportSalesmen(scopedQuery(query, actor)),
  generateSalesmanTargets,
  getLocation: (id, actor = {}) => mustFind(model.findLocationById, id, 'Location not found', actor),
  getLocationTarget: async (id, actor = {}) => ({
    ...(await mustFind(model.findLocationTargetById, id, 'Location target not found', actor)),
    sublocation_targets: await model.getSublocationTargetsByLocationTarget(id)
  }),
  getSalesman: (id, actor = {}) => mustFind(model.findSalesmanById, id, 'Salesman not found', actor),
  listSalesmanSublocations: async (id, query = {}, actor = {}) => {
    await mustFind(model.findSalesmanById, id, 'Salesman not found', actor);
    return model.listSalesmanSublocations(id, query);
  },
  getSublocation: (id, actor = {}) => mustFind(model.findSublocationById, id, 'Sublocation not found', actor),
  listLocationTargets: (query, actor = {}) => model.listLocationTargets(scopedQuery(query, actor)),
  listLocations: (query, actor = {}) => model.listLocations(scopedQuery(query, actor)),
  listSalesmen: (query, actor = {}) => model.listSalesmen(scopedQuery(query, actor)),
  listSublocations: (query, actor = {}) => model.listSublocations(scopedQuery(query, actor)),
  replaceSalesmanSublocations,
  unassignSalesmanSublocation: async (salesmanId, sublocationId, actor = {}) => {
    const salesman = await mustFind(model.findSalesmanById, salesmanId, 'Salesman not found', actor);
    const sublocation = await mustFind(model.findSublocationById, sublocationId, 'Sublocation not found', actor);
    assertSameStore(sublocation, salesman.store_id, 'sublocation_id', 'Sublocation does not belong to this store');
    return model.unassignSalesmanSublocation(salesmanId, sublocationId);
  },
  updateLocation: async (id, data, actor = {}) => {
    await mustFind(model.findLocationById, id, 'Location not found', actor);
    const { store_id, ...updates } = data;
    return model.updateLocation(id, updates);
  },
  updateLocationTarget,
  updateSalesman: async (id, data, actor = {}) => {
    await mustFind(model.findSalesmanById, id, 'Salesman not found', actor);
    const { store_id, ...updates } = data;
    return model.updateSalesman(id, updates);
  },
  updateSublocation
};

module.exports._private = {
  calculatePeriodEnd
};
