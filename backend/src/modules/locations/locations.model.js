const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, updateRecord } = require('../../utils/crud');

const simpleColumns = 'id, store_id, name, code, description, status, created_by, created_at, updated_at';

async function listLocations(input) {
  return listRecords({
    select: `SELECT ${simpleColumns}`,
    from: 'locations',
    filters: [
      { key: 'status', column: 'status' },
      { key: 'store_id', column: 'store_id' },
      { key: 'search', type: 'search', fields: ['name', 'code'] }
    ],
    orderBy: 'ORDER BY name ASC'
  }, input);
}

async function listSublocations(input) {
  return listRecords({
    select: `SELECT sl.id, sl.store_id, sl.location_id, l.name AS location_name, sl.name, sl.code, sl.description, sl.status, sl.created_by, sl.created_at, sl.updated_at`,
    from: 'sublocations sl',
    joins: 'JOIN locations l ON l.id = sl.location_id',
    filters: [
      { key: 'location_id', column: 'sl.location_id' },
      { key: 'status', column: 'sl.status' },
      { key: 'store_id', column: 'sl.store_id' },
      { key: 'search', type: 'search', fields: ['sl.name', 'sl.code', 'l.name'] }
    ],
    orderBy: 'ORDER BY l.name ASC, sl.name ASC'
  }, input);
}

async function listSalesmen(input) {
  return listRecords({
    select: `SELECT id, store_id, user_id, full_name, phone, email, vehicle_number, national_id, status, joined_at, created_at, updated_at`,
    from: 'salesmen',
    filters: [
      { key: 'status', column: 'status' },
      { key: 'store_id', column: 'store_id' },
      { key: 'search', type: 'search', fields: ['full_name', 'phone', 'email', 'vehicle_number'] }
    ],
    orderBy: 'ORDER BY full_name ASC'
  }, input);
}

async function listLocationTargets(input) {
  return listRecords({
    select: `SELECT lt.id, lt.store_id, lt.location_id, l.name AS location_name, lt.target_period, lt.period_start,
      lt.period_end, lt.target_amount, lt.status, lt.created_by, lt.created_at, lt.updated_at`,
    from: 'location_targets lt',
    joins: 'JOIN locations l ON l.id = lt.location_id',
    filters: [
      { key: 'location_id', column: 'lt.location_id' },
      { key: 'status', column: 'lt.status' },
      { key: 'store_id', column: 'lt.store_id' },
      { key: 'period_start', column: 'lt.period_start', operator: 'date_gte' },
      { key: 'period_end', column: 'lt.period_end', operator: 'date_lte' }
    ],
    orderBy: 'ORDER BY lt.period_start DESC, lt.id DESC'
  }, input);
}

async function findLocationById(id) {
  return findById('locations', id);
}

async function findSublocationById(id) {
  return findById('sublocations', id);
}

async function findSalesmanById(id) {
  return findById('salesmen', id);
}

async function findLocationTargetById(id) {
  return findById('location_targets', id);
}

async function findSublocationTargetById(id) {
  return findById('sublocation_targets', id);
}

async function createLocation(data) {
  return insertRecord('locations', data);
}

async function updateLocation(id, data) {
  return updateRecord('locations', id, data);
}

async function deactivateLocation(id) {
  const result = await query('UPDATE locations SET status = ? WHERE id = ?', ['inactive', id]);
  return result.affectedRows;
}

async function createSublocation(data) {
  return insertRecord('sublocations', data);
}

async function updateSublocation(id, data) {
  return updateRecord('sublocations', id, data);
}

async function deactivateSublocation(id) {
  const result = await query('UPDATE sublocations SET status = ? WHERE id = ?', ['inactive', id]);
  return result.affectedRows;
}

async function createSalesman(data) {
  return insertRecord('salesmen', data);
}

async function updateSalesman(id, data) {
  return updateRecord('salesmen', id, data);
}

async function deactivateSalesman(id) {
  const result = await query('UPDATE salesmen SET status = ? WHERE id = ?', ['inactive', id]);
  return result.affectedRows;
}

async function assignSalesmanSublocation(data) {
  return insertRecord('salesman_sublocations', data);
}

async function unassignSalesmanSublocation(salesmanId, sublocationId) {
  const result = await query(
    `UPDATE salesman_sublocations
     SET status = 'inactive', unassigned_at = CURRENT_DATE()
     WHERE salesman_id = ? AND sublocation_id = ? AND status = 'active'`,
    [salesmanId, sublocationId]
  );

  return result.affectedRows;
}

async function createLocationTarget(data) {
  return insertRecord('location_targets', data);
}

async function updateLocationTarget(id, data) {
  return updateRecord('location_targets', id, data);
}

async function createSublocationTarget(data) {
  return insertRecord('sublocation_targets', data);
}

async function getSublocationTargetsByLocationTarget(locationTargetId) {
  return query(
    `SELECT st.id, st.location_target_id, st.sublocation_id, sl.name AS sublocation_name,
      st.target_amount, st.status, st.created_at, st.updated_at
     FROM sublocation_targets st
     JOIN sublocations sl ON sl.id = st.sublocation_id
     WHERE st.location_target_id = ?
     ORDER BY sl.name ASC`,
    [locationTargetId]
  );
}

async function sumSublocationTargets(locationTargetId) {
  const rows = await query(
    `SELECT COALESCE(SUM(target_amount), 0) AS total
     FROM sublocation_targets
     WHERE location_target_id = ? AND status <> 'cancelled'`,
    [locationTargetId]
  );

  return Number(rows[0].total);
}

async function activeAssignmentsBySublocation(sublocationId) {
  return query(
    `SELECT id, salesman_id, sublocation_id
     FROM salesman_sublocations
     WHERE sublocation_id = ? AND status = 'active'`,
    [sublocationId]
  );
}

async function findActiveSalesmanSublocation(salesmanId, sublocationId) {
  const rows = await query(
    `SELECT id, salesman_id, sublocation_id, status
     FROM salesman_sublocations
     WHERE salesman_id = ? AND sublocation_id = ? AND status = 'active'
     LIMIT 1`,
    [salesmanId, sublocationId]
  );

  return rows[0] || null;
}

async function replaceSalesmanTargets(connection, sublocationTargetId, assignments, targetAmount, storeId = null) {
  await connection.execute(
    `UPDATE salesman_targets
     SET status = 'closed'
     WHERE sublocation_target_id = ? AND status = 'active'`,
    [sublocationTargetId]
  );

  if (assignments.length === 0) {
    return;
  }

  const totalUnits = Math.round(Number(targetAmount) * 10000);
  const baseUnits = Math.floor(totalUnits / assignments.length);
  const remainderUnits = totalUnits % assignments.length;
  const placeholders = assignments.map(() => '(?, ?, ?, ?, 0, "active")').join(', ');
  const params = assignments.flatMap((assignment, index) => {
    const targetUnits = baseUnits + (index < remainderUnits ? 1 : 0);
    return [
      storeId,
      sublocationTargetId,
      assignment.salesman_id,
      (targetUnits / 10000).toFixed(4)
    ];
  });

  await connection.execute(
    `INSERT INTO salesman_targets (
      store_id, sublocation_target_id, salesman_id, target_amount, achieved_sales_amount, status
    ) VALUES ${placeholders}`,
    params
  );
}

async function getSalesmanTargets(sublocationTargetId) {
  return query(
    `SELECT st.id, st.sublocation_target_id, st.salesman_id, s.full_name AS salesman_name,
      st.target_amount, st.achieved_sales_amount, st.status, st.created_at, st.updated_at
     FROM salesman_targets st
     JOIN salesmen s ON s.id = st.salesman_id
     WHERE st.sublocation_target_id = ?
     ORDER BY s.full_name ASC`,
    [sublocationTargetId]
  );
}

module.exports = {
  activeAssignmentsBySublocation,
  assignSalesmanSublocation,
  createLocation,
  createLocationTarget,
  createSalesman,
  createSublocation,
  createSublocationTarget,
  deactivateLocation,
  deactivateSalesman,
  deactivateSublocation,
  findLocationById,
  findLocationTargetById,
  findActiveSalesmanSublocation,
  findSalesmanById,
  findSublocationById,
  findSublocationTargetById,
  getSalesmanTargets,
  getSublocationTargetsByLocationTarget,
  listLocationTargets,
  listLocations,
  listSalesmen,
  listSublocations,
  replaceSalesmanTargets,
  sumSublocationTargets,
  unassignSalesmanSublocation,
  updateLocation,
  updateLocationTarget,
  updateSalesman,
  updateSublocation
};
