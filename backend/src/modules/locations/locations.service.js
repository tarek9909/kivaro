const ApiError = require('../../utils/ApiError');
const { decimal } = require('../../utils/money');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const model = require('./locations.model');
const commissionModel = require('../commissions/commissions.model');
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
  const { password } = data;
  const salesmanData = { ...data };
  delete salesmanData.password;
  delete salesmanData.create_login_user;
  const salaryEffectiveFrom = salesmanData.salary_effective_from || salesmanData.joined_at || new Date().toISOString().slice(0, 10);
  delete salesmanData.salary_effective_from;
  const scoped = scopedData(salesmanData, actor);
  await assertSalesmanCommissionRule(scoped.commission_rule_id, scoped.store_id);

  return withTransaction(async (connection) => {
    const user = await userService.createSalesmanUser({
      store_id: scoped.store_id,
      full_name: scoped.full_name,
      phone: scoped.phone,
      email: scoped.email,
      password,
      status: scoped.status
    }, actor, { connection });

    const salesman = await model.createSalesman({
      ...scoped,
      user_id: user.id
    }, connection);
    await model.createSalaryRate(connection, {
      store_id: salesman.store_id,
      salesman_id: salesman.id,
      monthly_salary: salesman.base_salary,
      effective_from: salaryEffectiveFrom,
      created_by: userId
    });
    return salesman;
  });
}

async function assertSalesmanCommissionRule(ruleId, storeId) {
  const rule = await commissionModel.findRuleById(ruleId);
  if (!rule) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'commission_rule_id', message: 'Commission rule not found' }
    ]);
  }
  assertSameStore(rule, storeId, 'commission_rule_id', 'Commission rule does not belong to this store');
  if (rule.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      { field: 'commission_rule_id', message: 'Commission rule must be active' }
    ]);
  }
  return rule;
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

function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' });
}

function targetDateRange(data, current = {}) {
  const calculated = withCalculatedTargetEnd(data, current);
  return { periodStart: calculated.period_start || current.period_start, periodEnd: calculated.period_end || current.period_end };
}

async function recordTargetEvent(connection, data) {
  await connection.execute(
    `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description, payload, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.storeId, data.locationTargetId, data.salesmanTargetId || null, data.eventType, data.description,
      data.payload ? JSON.stringify(data.payload) : null, data.userId || null]
  );
}

async function notifyTargetUsers(connection, storeId, locationTargetId, allocations, userId, eventType) {
  const salesmanIds = [...new Set(allocations.flatMap((entry) => entry.salesman_ids || []))];
  const recipients = new Set();
  if (salesmanIds.length) {
    const placeholders = salesmanIds.map(() => '?').join(', ');
    const [rows] = await connection.execute(
      `SELECT user_id FROM salesmen WHERE store_id = ? AND id IN (${placeholders}) AND user_id IS NOT NULL`,
      [storeId, ...salesmanIds]
    );
    rows.forEach((row) => recipients.add(row.user_id));
  }
  const [managers] = await connection.execute(
    `SELECT DISTINCT u.id
     FROM users u JOIN roles r ON r.id = u.role_id
     JOIN role_permissions rp ON rp.role_id = r.id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.store_id = ? AND u.status = 'active' AND p.permission_key = 'targets.manage'`,
    [storeId]
  );
  managers.forEach((row) => recipients.add(row.id));
  for (const recipientId of recipients) {
    await connection.execute(
      `INSERT INTO notifications (store_id, user_id, title, message, notification_type, reference_type, reference_id)
       VALUES (?, ?, ?, ?, 'info', 'location_target', ?)`,
      [storeId, recipientId, eventType === 'created' ? 'Target assigned' : 'Target assignment updated',
        'A target assignment relevant to your territory was updated.', locationTargetId]
    );
  }
}

async function validateTargetAllocations(connection, { storeId, locationId, periodStart, periodEnd, allocations, excludeTargetId = null }) {
  const uniqueSublocations = new Set();
  let allocated = decimal(0);
  for (const allocation of allocations) {
    const sublocationId = Number(allocation.sublocation_id);
    if (uniqueSublocations.has(sublocationId)) {
      throw ApiError.badRequest('Validation failed', [{ field: 'sublocation_targets', message: 'Each sublocation may appear only once' }]);
    }
    uniqueSublocations.add(sublocationId);
    allocated = allocated.plus(allocation.target_amount);
  }
  const sublocationIds = [...uniqueSublocations];
  const placeholders = sublocationIds.map(() => '?').join(', ');
  const [sublocations] = await connection.execute(
    `SELECT id, location_id, store_id, status FROM sublocations WHERE id IN (${placeholders}) FOR UPDATE`, sublocationIds
  );
  if (sublocations.length !== sublocationIds.length || sublocations.some((row) => Number(row.store_id) !== Number(storeId) || Number(row.location_id) !== Number(locationId) || row.status !== 'active')) {
    throw ApiError.badRequest('Validation failed', [{ field: 'sublocation_targets', message: 'Every sublocation must be active and belong to the selected location' }]);
  }

  for (const allocation of allocations) {
    const salesmanIds = [...new Set((allocation.salesman_ids || []).map(Number))];
    if (!salesmanIds.length) continue;
    const salesmanPlaceholders = salesmanIds.map(() => '?').join(', ');
    const [assignments] = await connection.execute(
      `SELECT ss.salesman_id
       FROM salesman_sublocations ss JOIN salesmen s ON s.id = ss.salesman_id
       JOIN commission_rules cr ON cr.id = s.commission_rule_id
       WHERE ss.sublocation_id = ? AND ss.status = 'active' AND s.status = 'active'
         AND cr.status = 'active' AND s.store_id = ? AND ss.salesman_id IN (${salesmanPlaceholders})`,
      [allocation.sublocation_id, storeId, ...salesmanIds]
    );
    if (assignments.length !== salesmanIds.length) {
      throw ApiError.badRequest('Validation failed', [{ field: 'sublocation_targets', message: 'Selected salesmen must be active, have an active commission rule, and be assigned to their sublocation' }]);
    }
    const [overlaps] = await connection.execute(
      `SELECT st.salesman_id
       FROM salesman_targets st
       JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
       JOIN location_targets lt ON lt.id = slt.location_target_id
       WHERE st.store_id = ? AND slt.sublocation_id = ? AND st.status = 'active'
         AND lt.status = 'active' AND lt.period_start <= ? AND lt.period_end >= ?
         ${excludeTargetId ? 'AND lt.id <> ?' : ''}
         AND st.salesman_id IN (${salesmanPlaceholders}) LIMIT 1`,
      excludeTargetId
        ? [storeId, allocation.sublocation_id, periodEnd, periodStart, excludeTargetId, ...salesmanIds]
        : [storeId, allocation.sublocation_id, periodEnd, periodStart, ...salesmanIds]
    );
    if (overlaps.length) {
      throw ApiError.conflict('A selected salesman already has an overlapping active target in this sublocation');
    }
  }
  return allocated;
}

async function createTargetBundle(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  const { periodStart, periodEnd } = targetDateRange(scoped);
  if (!periodStart || !periodEnd) throw ApiError.badRequest('Validation failed', [{ field: 'period_start', message: 'A valid target period is required' }]);
  let targetId;
  await withTransaction(async (connection) => {
    const [locations] = await connection.execute('SELECT id, store_id, status FROM locations WHERE id = ? FOR UPDATE', [scoped.location_id]);
    const location = locations[0];
    if (!location || Number(location.store_id) !== Number(scoped.store_id) || location.status !== 'active') throw ApiError.badRequest('Validation failed', [{ field: 'location_id', message: 'Location must be active and belong to this store' }]);
    const allocated = await validateTargetAllocations(connection, {
      storeId: scoped.store_id, locationId: scoped.location_id, periodStart, periodEnd, allocations: scoped.sublocation_targets
    });
    if (!allocated.eq(scoped.target_amount)) throw ApiError.badRequest('Validation failed', [{ field: 'sublocation_targets', message: 'Sublocation targets must equal the location target amount exactly' }]);
    const [targetInsert] = await connection.execute(
      `INSERT INTO location_targets (store_id, location_id, target_period, period_start, period_end, target_amount, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [scoped.store_id, scoped.location_id, scoped.target_period, periodStart, periodEnd, scoped.target_amount, userId]
    );
    targetId = targetInsert.insertId;
    for (const allocation of scoped.sublocation_targets) {
      const [subInsert] = await connection.execute(
        `INSERT INTO sublocation_targets (store_id, location_target_id, sublocation_id, target_amount, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [scoped.store_id, targetId, allocation.sublocation_id, allocation.target_amount]
      );
      await model.reconcileSalesmanTargets(connection, subInsert.insertId,
        (allocation.salesman_ids || []).map((salesman_id) => ({ salesman_id })), allocation.target_amount, scoped.store_id);
      await model.captureCommissionSnapshots(connection, subInsert.insertId);
    }
    await recordTargetEvent(connection, { storeId: scoped.store_id, locationTargetId: targetId, eventType: 'created', description: 'Active target bundle created', payload: { sublocation_targets: scoped.sublocation_targets }, userId });
    await notifyTargetUsers(connection, scoped.store_id, targetId, scoped.sublocation_targets, userId, 'created');
  });
  return getLocationTarget(targetId, actor);
}

async function updateTargetAssignment(id, data, userId, actor = {}) {
  const target = await mustFind(model.findLocationTargetById, id, 'Location target not found', actor);
  if (target.status !== 'active' || target.period_end < today()) throw ApiError.conflict('Only open active targets can be reassigned');
  let hasCommission;
  await withTransaction(async (connection) => {
    const [commissionRows] = await connection.execute(
      `SELECT 1 FROM commission_calculations cc JOIN salesman_targets st ON st.id = cc.salesman_target_id
       JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id WHERE slt.location_target_id = ? LIMIT 1 FOR UPDATE`, [id]
    );
    hasCommission = commissionRows.length > 0;
    if (hasCommission) throw ApiError.conflict('Targets with a commission calculation cannot be reassigned');
    const allocated = await validateTargetAllocations(connection, {
      storeId: target.store_id, locationId: target.location_id, periodStart: target.period_start, periodEnd: target.period_end,
      allocations: data.sublocation_targets, excludeTargetId: id
    });
    if (!allocated.eq(data.target_amount)) throw ApiError.badRequest('Validation failed', [{ field: 'sublocation_targets', message: 'Sublocation targets must equal the location target amount exactly' }]);
    await connection.execute('UPDATE location_targets SET target_amount = ? WHERE id = ?', [data.target_amount, id]);
    const [existing] = await connection.execute('SELECT id, sublocation_id FROM sublocation_targets WHERE location_target_id = ? FOR UPDATE', [id]);
    const existingBySublocation = new Map(existing.map((row) => [Number(row.sublocation_id), row]));
    const requested = new Set(data.sublocation_targets.map((row) => Number(row.sublocation_id)));
    for (const row of existing) {
      if (!requested.has(Number(row.sublocation_id))) {
        await connection.execute("UPDATE salesman_targets SET status = 'closed' WHERE sublocation_target_id = ? AND status = 'active'", [row.id]);
        await connection.execute("UPDATE sublocation_targets SET status = 'closed' WHERE id = ?", [row.id]);
      }
    }
    for (const allocation of data.sublocation_targets) {
      let subTarget = existingBySublocation.get(Number(allocation.sublocation_id));
      if (subTarget) {
        await connection.execute("UPDATE sublocation_targets SET target_amount = ?, status = 'active' WHERE id = ?", [allocation.target_amount, subTarget.id]);
      } else {
        const [insert] = await connection.execute(
          "INSERT INTO sublocation_targets (store_id, location_target_id, sublocation_id, target_amount, status) VALUES (?, ?, ?, ?, 'active')",
          [target.store_id, id, allocation.sublocation_id, allocation.target_amount]
        );
        subTarget = { id: insert.insertId };
      }
      await model.reconcileSalesmanTargets(connection, subTarget.id,
        (allocation.salesman_ids || []).map((salesman_id) => ({ salesman_id })), allocation.target_amount, target.store_id);
      await model.captureCommissionSnapshots(connection, subTarget.id);
    }
    await recordTargetEvent(connection, { storeId: target.store_id, locationTargetId: id, eventType: 'assignment_updated', description: 'Target assignment updated', payload: data, userId });
    await notifyTargetUsers(connection, target.store_id, id, data.sublocation_targets, userId, 'updated');
  });
  return getLocationTarget(id, actor);
}

async function getLocationTarget(id, actor = {}) {
  const target = await mustFind(model.findLocationTargetById, id, 'Location target not found', actor);
  const [sublocationTargets, salesmanTargets, events, hasCommission] = await Promise.all([
    model.getSublocationTargetsByLocationTarget(id),
    model.getSalesmanTargetsByLocationTarget(id),
    model.getTargetEvents(id),
    model.hasCommissionForLocationTarget(id)
  ]);
  const bySublocation = new Map();
  for (const salesmanTarget of salesmanTargets) {
    const key = Number(salesmanTarget.sublocation_target_id);
    if (!bySublocation.has(key)) bySublocation.set(key, []);
    const collected = Number(salesmanTarget.collected_amount || 0);
    const amount = Number(salesmanTarget.target_amount || 0);
    bySublocation.get(key).push({
      ...salesmanTarget,
      collected_amount: collected,
      remaining_amount: Math.max(amount - collected, 0),
      achievement_percentage: amount ? Number(((collected / amount) * 100).toFixed(2)) : 0
    });
  }
  const detailedSublocations = sublocationTargets.map((sublocation) => {
    const salesman_targets = bySublocation.get(Number(sublocation.id)) || [];
    const collected_amount = salesman_targets.reduce((sum, row) => sum + Number(row.collected_amount || 0), 0);
    const amount = Number(sublocation.target_amount || 0);
    return {
      ...sublocation,
      salesman_targets,
      collected_amount,
      remaining_amount: Math.max(amount - collected_amount, 0),
      achievement_percentage: amount ? Number(((collected_amount / amount) * 100).toFixed(2)) : 0,
      is_unassigned: salesman_targets.filter((row) => row.status === 'active').length === 0
    };
  });
  const collected_amount = detailedSublocations.reduce((sum, row) => sum + Number(row.collected_amount || 0), 0);
  const amount = Number(target.target_amount || 0);
  return {
    ...target,
    collected_amount,
    remaining_amount: Math.max(amount - collected_amount, 0),
    achievement_percentage: amount ? Number(((collected_amount / amount) * 100).toFixed(2)) : 0,
    sublocation_targets: detailedSublocations,
    events,
    capabilities: { can_edit_assignment: target.status === 'active' && target.period_end >= today() && !hasCommission }
  };
}

async function getTargetSetup(locationId, actor = {}) {
  const location = await mustFind(model.findLocationById, locationId, 'Location not found', actor);
  const sublocations = (await model.listSublocations({ store_id: location.store_id, location_id: location.id, allRows: true })).rows
    .filter((sublocation) => sublocation.status === 'active');
  const rows = await Promise.all(sublocations.map(async (sublocation) => ({
    ...sublocation,
    salesmen: await model.activeAssignmentsBySublocation(sublocation.id)
  })));
  const salesmanIds = [...new Set(rows.flatMap((row) => row.salesmen.map((entry) => entry.salesman_id)))];
  const salesmen = salesmanIds.length
    ? (await model.listSalesmen({ store_id: location.store_id, allRows: true })).rows
    : [];
  const salesmanById = new Map(salesmen.map((salesman) => [Number(salesman.id), salesman]));
  return {
    location,
    sublocations: rows.map((row) => ({
      ...row,
      salesmen: row.salesmen.map((assignment) => salesmanById.get(Number(assignment.salesman_id))).filter(Boolean)
    }))
  };
}

module.exports = {
  assignSalesmanSublocation,
  createLocation: (data, userId, actor = {}) => model.createLocation({ ...scopedData(data, actor), created_by: userId }),
  createTargetBundle,
  createSalesman,
  createSublocation,
  deleteLocation: async (id, actor = {}) => { await mustFind(model.findLocationById, id, 'Location not found', actor); await model.deactivateLocation(id); },
  deleteSalesman: async (id, actor = {}) => {
    const salesman = await mustFind(model.findSalesmanById, id, 'Salesman not found', actor);
    await withTransaction(async (connection) => {
      await model.deactivateSalesman(id, { deactivatedBy: actor.id || null }, connection);
      await connection.execute(
        `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description, created_by)
         SELECT lt.store_id, lt.id, st.id, 'salesman_deactivated', ?, ?
         FROM salesman_targets st
         JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
         JOIN location_targets lt ON lt.id = slt.location_target_id
         WHERE st.salesman_id = ? AND st.status = 'active'`,
        [`Salesman ${salesman.full_name} was deactivated; reassign open targets before their period closes.`, actor.id || null, id]
      );
    });
  },
  deleteSublocation: async (id, actor = {}) => { await mustFind(model.findSublocationById, id, 'Sublocation not found', actor); await model.deactivateSublocation(id); },
  exportSalesmen: (query, actor = {}) => model.exportSalesmen(scopedQuery(query, actor)),
  getLocation: (id, actor = {}) => mustFind(model.findLocationById, id, 'Location not found', actor),
  getLocationTarget,
  getTargetSetup,
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
  updateTargetAssignment,
  updateSalesman: async (id, data, actor = {}) => {
    const current = await mustFind(model.findSalesmanById, id, 'Salesman not found', actor);
    const { store_id, salary_effective_from, ...updates } = data;
    if (updates.commission_rule_id !== undefined) {
      await assertSalesmanCommissionRule(updates.commission_rule_id, current.store_id);
    }
    return withTransaction(async (connection) => {
      if (updates.status === 'inactive' && current.status !== 'inactive') {
        await model.deactivateSalesman(id, { employmentEndDate: updates.employment_end_date || null, deactivatedBy: actor.id || null }, connection);
        await connection.execute(
          `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description, created_by)
           SELECT lt.store_id, lt.id, st.id, 'salesman_deactivated', ?, ?
           FROM salesman_targets st
           JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
           JOIN location_targets lt ON lt.id = slt.location_target_id
           WHERE st.salesman_id = ? AND st.status = 'active'
             AND NOT EXISTS (SELECT 1 FROM target_events te WHERE te.salesman_target_id = st.id AND te.event_type = 'salesman_deactivated')`,
          [`Salesman ${current.full_name} was deactivated; collected-cash attribution and automatic commission are paused until the target is reassigned.`, actor.id || null, id]
        );
        delete updates.status;
        delete updates.employment_end_date;
      }
      const updated = await model.updateSalesman(id, updates, connection);
      if (updates.base_salary !== undefined && !decimal(updates.base_salary).eq(decimal(current.base_salary || 0))) {
        await model.createSalaryRate(connection, {
          store_id: current.store_id,
          salesman_id: current.id,
          monthly_salary: updates.base_salary,
          effective_from: salary_effective_from || new Date().toISOString().slice(0, 10),
          created_by: actor.id || null
        });
      }
      return updated;
    });
  },
  updateSublocation
};

module.exports._private = {
  calculatePeriodEnd
};
