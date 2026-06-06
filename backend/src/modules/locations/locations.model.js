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
    select: `SELECT s.id, s.store_id, s.user_id, s.full_name, s.phone, s.email, s.vehicle_number,
      s.national_id, s.base_salary, s.status, s.joined_at, s.created_at, s.updated_at,
      COALESCE(active_assignments.active_sublocations, '') AS active_sublocations`,
    from: 'salesmen s',
    joins: `LEFT JOIN (
      SELECT ss.salesman_id,
        GROUP_CONCAT(CONCAT(l.name, ' - ', sl.name) ORDER BY l.name ASC, sl.name ASC SEPARATOR ', ') AS active_sublocations
      FROM salesman_sublocations ss
      JOIN sublocations sl ON sl.id = ss.sublocation_id
      JOIN locations l ON l.id = sl.location_id
      WHERE ss.status = 'active'
      GROUP BY ss.salesman_id
    ) active_assignments ON active_assignments.salesman_id = s.id`,
    filters: [
      { key: 'status', column: 's.status' },
      { key: 'store_id', column: 's.store_id' },
      { key: 'search', type: 'search', fields: ['s.full_name', 's.phone', 's.email', 's.vehicle_number'] }
    ],
    orderBy: 'ORDER BY s.full_name ASC'
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

async function execute(connection, sql, params) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }

  return query(sql, params);
}

async function findSalesmanById(id, connection = null) {
  if (!connection) {
    return findById('salesmen', id);
  }

  const rows = await execute(connection, 'SELECT * FROM salesmen WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
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

async function createSalesman(data, connection = null) {
  if (!connection) {
    return insertRecord('salesmen', data);
  }

  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => key);
  const placeholders = columns.map(() => '?').join(', ');
  const params = entries.map(([, value]) => (value === undefined || value === '' ? null : value));
  const result = await execute(
    connection,
    `INSERT INTO salesmen (${columns.join(', ')})
     VALUES (${placeholders})`,
    params
  );

  return findSalesmanById(result.insertId, connection);
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

async function listSalesmanSublocations(salesmanId, input = {}) {
  const params = [salesmanId];
  const conditions = ['ss.salesman_id = ?'];

  if (input.status) {
    conditions.push('ss.status = ?');
    params.push(input.status);
  }

  return query(
    `SELECT ss.id, ss.salesman_id, ss.sublocation_id, ss.assigned_at, ss.unassigned_at,
      ss.status, ss.created_at, sl.name AS sublocation_name, sl.code AS sublocation_code,
      sl.location_id, l.name AS location_name
     FROM salesman_sublocations ss
     JOIN sublocations sl ON sl.id = ss.sublocation_id
     JOIN locations l ON l.id = sl.location_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ss.status ASC, l.name ASC, sl.name ASC, ss.created_at DESC`,
    params
  );
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

function splitTargetAmount(targetAmount, count) {
  const totalUnits = Math.round(Number(targetAmount) * 10000);
  const baseUnits = Math.floor(totalUnits / count);
  const remainderUnits = totalUnits % count;

  return Array.from({ length: count }, (_, index) => {
    const targetUnits = baseUnits + (index < remainderUnits ? 1 : 0);
    return (targetUnits / 10000).toFixed(4);
  });
}

async function reconcileSalesmanTargets(connection, sublocationTargetId, assignments, targetAmount, storeId = null) {
  const uniqueAssignments = Array.from(
    new Map(assignments.map((assignment) => [Number(assignment.salesman_id), assignment])).values()
  );

  if (uniqueAssignments.length === 0) {
    await connection.execute(
      `UPDATE salesman_targets
       SET status = 'closed'
       WHERE sublocation_target_id = ? AND status = 'active'`,
      [sublocationTargetId]
    );
    return;
  }

  const targetAmounts = splitTargetAmount(targetAmount, uniqueAssignments.length);
  const salesmanIds = uniqueAssignments.map((assignment) => Number(assignment.salesman_id));
  const placeholders = salesmanIds.map(() => '?').join(', ');

  await connection.execute(
    `UPDATE salesman_targets
     SET status = 'closed'
     WHERE sublocation_target_id = ?
       AND status = 'active'
       AND salesman_id NOT IN (${placeholders})`,
    [sublocationTargetId, ...salesmanIds]
  );

  const [existingRows] = await connection.execute(
    `SELECT id, salesman_id
     FROM salesman_targets
     WHERE sublocation_target_id = ?
       AND status = 'active'
       AND salesman_id IN (${placeholders})
     FOR UPDATE`,
    [sublocationTargetId, ...salesmanIds]
  );
  const existingBySalesmanId = new Map(existingRows.map((row) => [Number(row.salesman_id), row]));

  for (const [index, assignment] of uniqueAssignments.entries()) {
    const salesmanId = Number(assignment.salesman_id);
    const existing = existingBySalesmanId.get(salesmanId);

    if (existing) {
      await connection.execute(
        `UPDATE salesman_targets
         SET target_amount = ?, store_id = ?
         WHERE id = ?`,
        [targetAmounts[index], storeId, existing.id]
      );
      continue;
    }

    await connection.execute(
      `INSERT INTO salesman_targets (
        store_id, sublocation_target_id, salesman_id, target_amount, achieved_sales_amount, status
      ) VALUES (?, ?, ?, ?, 0, 'active')`,
      [storeId, sublocationTargetId, salesmanId, targetAmounts[index]]
    );
  }
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
  listSalesmanSublocations,
  listLocationTargets,
  listLocations,
  listSalesmen,
  listSublocations,
  reconcileSalesmanTargets,
  sumSublocationTargets,
  unassignSalesmanSublocation,
  updateLocation,
  updateLocationTarget,
  updateSalesman,
  updateSublocation
};
