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

async function lockSublocationsByIds(connection, sublocationIds) {
  if (!sublocationIds.length) return [];
  const placeholders = sublocationIds.map(() => '?').join(', ');
  const [rows] = await connection.execute(
    `SELECT id, store_id, location_id, status
     FROM sublocations
     WHERE id IN (${placeholders})
     FOR UPDATE`,
    sublocationIds
  );
  return rows;
}

async function replaceActiveSalesmanSublocations(connection, salesmanId, sublocationIds, assignedAt) {
  const [activeRows] = await connection.execute(
    `SELECT id, sublocation_id
     FROM salesman_sublocations
     WHERE salesman_id = ? AND status = 'active'
     FOR UPDATE`,
    [salesmanId]
  );
  const requested = new Set(sublocationIds.map(Number));
  const activeIds = new Set(activeRows.map((row) => Number(row.sublocation_id)));
  const removed = activeRows.filter((row) => !requested.has(Number(row.sublocation_id)));

  if (removed.length) {
    const placeholders = removed.map(() => '?').join(', ');
    await connection.execute(
      `UPDATE salesman_sublocations
       SET status = 'inactive', unassigned_at = ?
       WHERE id IN (${placeholders})`,
      [assignedAt, ...removed.map((row) => row.id)]
    );
  }

  const added = sublocationIds.filter((id) => !activeIds.has(Number(id)));
  for (const sublocationId of added) {
    await connection.execute(
      `INSERT INTO salesman_sublocations (
        salesman_id, sublocation_id, assigned_at, unassigned_at, status
      ) VALUES (?, ?, ?, NULL, 'active')`,
      [salesmanId, sublocationId, assignedAt]
    );
  }

  return {
    added_sublocation_ids: added.map(Number),
    removed_sublocation_ids: removed.map((row) => Number(row.sublocation_id))
  };
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

const DELIVERED_DISPATCH_STATUSES = "'dispatched', 'partially_settled', 'completed'";

function addDateFilters(input = {}, column) {
  const conditions = [];
  const params = [];
  if (input.date_from) {
    conditions.push(`DATE(${column}) >= ?`);
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push(`DATE(${column}) <= ?`);
    params.push(input.date_to);
  }
  return { conditions, params };
}

function salesmanBaseFilters(input = {}) {
  const conditions = [];
  const params = [];

  if (input.store_id !== undefined && input.store_id !== null && input.store_id !== '') {
    conditions.push('s.store_id = ?');
    params.push(input.store_id);
  }
  if (input.salesman_id !== undefined && input.salesman_id !== null && input.salesman_id !== '') {
    conditions.push('s.id = ?');
    params.push(input.salesman_id);
  }
  if (input.salesman_status) {
    conditions.push('s.status = ?');
    params.push(input.salesman_status);
  }
  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push('(s.full_name LIKE ? OR s.phone LIKE ? OR s.email LIKE ? OR s.vehicle_number LIKE ?)');
    params.push(term, term, term, term);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

function salesmanActivityFilters(input = {}, {
  storeColumn,
  salesmanColumn,
  dateColumn,
  statusColumn = null,
  statusValue = null,
  searchColumns = []
}) {
  const conditions = [];
  const params = [];

  if (input.store_id !== undefined && input.store_id !== null && input.store_id !== '') {
    conditions.push(`${storeColumn} = ?`);
    params.push(input.store_id);
  }
  if (input.salesman_id !== undefined && input.salesman_id !== null && input.salesman_id !== '') {
    conditions.push(`${salesmanColumn} = ?`);
    params.push(input.salesman_id);
  }
  if (statusColumn && statusValue) {
    conditions.push(`${statusColumn} = ?`);
    params.push(statusValue);
  }
  if (input.salesman_status) {
    conditions.push('s.status = ?');
    params.push(input.salesman_status);
  }
  if (input.date_from) {
    conditions.push(`DATE(${dateColumn}) >= ?`);
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push(`DATE(${dateColumn}) <= ?`);
    params.push(input.date_to);
  }
  if (input.search && searchColumns.length) {
    const term = `%${input.search}%`;
    conditions.push(`(${searchColumns.map((column) => `${column} LIKE ?`).join(' OR ')})`);
    params.push(...searchColumns.map(() => term));
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

function periodWhere(input = {}, storeColumn, dateColumn) {
  const conditions = [`${storeColumn} = ?`];
  const params = [input.store_id];
  const period = addDateFilters(input, dateColumn);
  conditions.push(...period.conditions);
  params.push(...period.params);
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

async function exportSalesmanPerformance(input = {}) {
  const dispatchPeriod = periodWhere(input, 'dr.store_id', 'dr.request_date');
  const costPeriod = periodWhere(input, 'dr.store_id', 'dr.request_date');
  const posPeriod = periodWhere(input, 'po.store_id', 'po.order_date');
  const invoicePeriod = periodWhere(input, 'i.store_id', 'i.invoice_date');
  const base = salesmanBaseFilters(input);

  return query(
    `SELECT
       s.id AS salesman_id,
       s.full_name AS salesman_name,
       s.phone,
       s.email,
       s.vehicle_number,
       s.base_salary,
       s.status AS salesman_status,
       s.joined_at,
       COALESCE(dispatch_summary.dispatch_count, 0) AS dispatch_count,
       COALESCE(dispatch_summary.delivered_dispatch_count, 0) AS delivered_dispatch_count,
       COALESCE(dispatch_summary.delivered_customer_count, 0) AS delivered_customer_count,
       COALESCE(dispatch_summary.sales_revenue, 0) AS sales_revenue,
       COALESCE(dispatch_summary.total_collected, 0) AS total_collected,
       COALESCE(dispatch_summary.total_debt, 0) AS total_debt,
       COALESCE(cost_summary.sales_cogs, 0) AS sales_cogs,
       COALESCE(cost_summary.gift_cogs, 0) AS gift_cogs,
       COALESCE(dispatch_summary.sales_revenue, 0)
         - COALESCE(cost_summary.sales_cogs, 0)
         - COALESCE(cost_summary.gift_cogs, 0) AS gross_profit_after_gifts,
       COALESCE(invoice_summary.issued_invoice_count, 0) AS issued_invoice_count,
       COALESCE(invoice_summary.issued_invoice_total, 0) AS issued_invoice_total,
       COALESCE(pos_summary.pos_order_count, 0) AS pos_order_count,
       COALESCE(pos_summary.pending_pos_order_count, 0) AS pending_pos_order_count,
       COALESCE(pos_summary.converted_pos_order_count, 0) AS converted_pos_order_count
     FROM salesmen s
     LEFT JOIN (
       SELECT overview.salesman_id,
         COUNT(*) AS dispatch_count,
         SUM(overview.status IN (${DELIVERED_DISPATCH_STATUSES})) AS delivered_dispatch_count,
         SUM(overview.delivered_customer_count) AS delivered_customer_count,
         SUM(CASE WHEN overview.status IN (${DELIVERED_DISPATCH_STATUSES}) THEN overview.total_amount ELSE 0 END) AS sales_revenue,
         SUM(CASE WHEN overview.status IN (${DELIVERED_DISPATCH_STATUSES}) THEN overview.total_collected ELSE 0 END) AS total_collected,
         SUM(CASE WHEN overview.status IN (${DELIVERED_DISPATCH_STATUSES}) THEN overview.total_debt ELSE 0 END) AS total_debt
       FROM (
         SELECT dr.id, dr.salesman_id, dr.status, dr.total_amount, dr.total_collected, dr.total_debt,
           COUNT(DISTINCT CASE WHEN dr.status IN (${DELIVERED_DISPATCH_STATUSES}) THEN dc.customer_id END) AS delivered_customer_count
         FROM dispatch_requests dr
         LEFT JOIN dispatch_customers dc ON dc.dispatch_request_id = dr.id
         ${dispatchPeriod.where}
         GROUP BY dr.id, dr.salesman_id, dr.status, dr.total_amount, dr.total_collected, dr.total_debt
       ) overview
       GROUP BY overview.salesman_id
     ) dispatch_summary ON dispatch_summary.salesman_id = s.id
     LEFT JOIN (
       SELECT dr.salesman_id,
         SUM(CASE
           WHEN di.line_type = 'sale' AND dla.status = 'dispatched' THEN dla.total_cost
           WHEN di.line_type = 'sale' AND dla.status = 'returned' THEN -dla.total_cost
           ELSE 0
         END) AS sales_cogs,
         SUM(CASE
           WHEN di.line_type = 'free_gift' AND dla.status = 'dispatched' THEN dla.total_cost
           WHEN di.line_type = 'free_gift' AND dla.status = 'returned' THEN -dla.total_cost
           ELSE 0
         END) AS gift_cogs
       FROM dispatch_requests dr
       JOIN dispatch_items di ON di.dispatch_request_id = dr.id
       JOIN dispatch_line_allocations dla ON dla.dispatch_item_id = di.id
       ${costPeriod.where}
       GROUP BY dr.salesman_id
     ) cost_summary ON cost_summary.salesman_id = s.id
     LEFT JOIN (
       SELECT po.salesman_id,
         COUNT(*) AS pos_order_count,
         SUM(po.status = 'pending') AS pending_pos_order_count,
         SUM(po.status = 'converted') AS converted_pos_order_count
       FROM pos_orders po
       ${posPeriod.where}
       GROUP BY po.salesman_id
     ) pos_summary ON pos_summary.salesman_id = s.id
     LEFT JOIN (
       SELECT dr.salesman_id,
         COUNT(*) AS issued_invoice_count,
         SUM(i.total_amount) AS issued_invoice_total
       FROM invoices i
       JOIN dispatch_requests dr ON dr.id = i.dispatch_request_id
       ${invoicePeriod.where}
         AND i.status = 'issued'
       GROUP BY dr.salesman_id
     ) invoice_summary ON invoice_summary.salesman_id = s.id
     ${base.where}
     ORDER BY s.full_name ASC, s.id ASC`,
    [
      ...dispatchPeriod.params,
      ...costPeriod.params,
      ...posPeriod.params,
      ...invoicePeriod.params,
      ...base.params
    ]
  );
}

async function exportSalesmanOrders(input = {}) {
  const filters = salesmanActivityFilters(input, {
    storeColumn: 'po.store_id',
    salesmanColumn: 'po.salesman_id',
    dateColumn: 'po.order_date',
    statusColumn: 'po.status',
    statusValue: input.pos_status,
    searchColumns: ['po.order_number', 's.full_name', 'c.name', 'c.phone']
  });

  return query(
    `SELECT
       po.id AS pos_order_id,
       po.order_number,
       po.order_date,
       po.status AS pos_status,
       po.notes AS order_notes,
       s.id AS salesman_id,
       s.full_name AS salesman_name,
       c.id AS customer_id,
       c.customer_code,
       c.name AS customer_name,
       c.phone AS customer_phone,
       l.name AS location_name,
       sl.name AS sublocation_name,
       w.name AS warehouse_name,
       dr.dispatch_number AS converted_dispatch_number,
       dr.status AS converted_dispatch_status,
       COALESCE(line_summary.sale_quantity, 0) AS sale_quantity,
       COALESCE(line_summary.gift_quantity, 0) AS gift_quantity,
       COALESCE(line_summary.sale_subtotal, 0) AS sale_subtotal,
       COALESCE(line_summary.sale_vat, 0) AS sale_vat,
       COALESCE(line_summary.sale_total, 0) AS sale_total,
       po.created_at,
       po.updated_at
     FROM pos_orders po
     JOIN salesmen s ON s.id = po.salesman_id
     JOIN customers c ON c.id = po.customer_id
     JOIN locations l ON l.id = po.location_id
     JOIN sublocations sl ON sl.id = po.sublocation_id
     JOIN warehouses w ON w.id = po.warehouse_id
     LEFT JOIN dispatch_requests dr ON dr.id = po.dispatch_request_id
     LEFT JOIN (
       SELECT pos_order_id,
         SUM(CASE WHEN line_type = 'sale' THEN quantity ELSE 0 END) AS sale_quantity,
         SUM(CASE WHEN line_type = 'free_gift' THEN quantity ELSE 0 END) AS gift_quantity,
         SUM(CASE WHEN line_type = 'sale' THEN quantity * unit_price ELSE 0 END) AS sale_subtotal,
         SUM(CASE WHEN line_type = 'sale' THEN quantity * unit_price * vat_rate / 100 ELSE 0 END) AS sale_vat,
         SUM(CASE WHEN line_type = 'sale' THEN quantity * unit_price * (1 + vat_rate / 100) ELSE 0 END) AS sale_total
       FROM pos_order_lines
       GROUP BY pos_order_id
     ) line_summary ON line_summary.pos_order_id = po.id
     ${filters.where}
     ORDER BY po.order_date DESC, po.id DESC`,
    filters.params
  );
}

async function exportSalesmanInvoices(input = {}) {
  const filters = salesmanActivityFilters(input, {
    storeColumn: 'i.store_id',
    salesmanColumn: 'dr.salesman_id',
    dateColumn: 'i.invoice_date',
    statusColumn: 'i.status',
    statusValue: input.invoice_status,
    searchColumns: ['i.invoice_number', 'dr.dispatch_number', 's.full_name', 'c.name']
  });

  return query(
    `SELECT
       i.id AS invoice_id,
       i.invoice_number,
       i.revision AS invoice_revision,
       i.status AS invoice_status,
       i.invoice_date,
       i.subtotal_amount AS invoice_subtotal_amount,
       i.vat_amount AS invoice_vat_amount,
       i.total_amount AS invoice_total_amount,
       dr.id AS dispatch_request_id,
       dr.dispatch_number,
       dr.request_date AS dispatch_request_date,
       dr.status AS dispatch_status,
       s.id AS salesman_id,
       s.full_name AS salesman_name,
       c.id AS customer_id,
       c.customer_code,
       c.name AS customer_name,
       c.phone AS customer_phone,
       c.address,
       c.detailed_address,
       l.name AS location_name,
       sl.name AS sublocation_name
     FROM invoices i
     JOIN dispatch_requests dr ON dr.id = i.dispatch_request_id
     JOIN salesmen s ON s.id = dr.salesman_id
     JOIN dispatch_customers dc ON dc.id = i.dispatch_customer_id
     JOIN customers c ON c.id = dc.customer_id
     JOIN locations l ON l.id = c.location_id
     JOIN sublocations sl ON sl.id = c.sublocation_id
     ${filters.where}
     ORDER BY i.invoice_date DESC, i.id DESC`,
    filters.params
  );
}

async function exportDeliveredCustomers(input = {}) {
  const filters = salesmanActivityFilters(input, {
    storeColumn: 'dr.store_id',
    salesmanColumn: 'dr.salesman_id',
    dateColumn: 'dr.request_date',
    searchColumns: ['dr.dispatch_number', 's.full_name', 'c.name', 'c.phone']
  });
  const deliveredConditions = [filters.where.replace(/^WHERE\s+/, ''), `dr.status IN (${DELIVERED_DISPATCH_STATUSES})`]
    .filter(Boolean)
    .join(' AND ');

  return query(
    `SELECT
       dr.id AS dispatch_request_id,
       dr.dispatch_number,
       dr.request_date AS delivery_date,
       dr.status AS dispatch_status,
       s.id AS salesman_id,
       s.full_name AS salesman_name,
       dc.id AS dispatch_customer_id,
       c.id AS customer_id,
       c.customer_code,
       c.name AS customer_name,
       c.phone AS customer_phone,
       c.address,
       c.detailed_address,
       l.name AS location_name,
       sl.name AS sublocation_name,
       dc.customer_total_amount,
       dc.collected_amount,
       dc.debt_amount,
       dc.payment_status,
       i.invoice_number,
       i.status AS invoice_status,
       i.total_amount AS invoice_total_amount
     FROM dispatch_customers dc
     JOIN dispatch_requests dr ON dr.id = dc.dispatch_request_id
     JOIN salesmen s ON s.id = dr.salesman_id
     JOIN customers c ON c.id = dc.customer_id
     JOIN locations l ON l.id = c.location_id
     JOIN sublocations sl ON sl.id = c.sublocation_id
     LEFT JOIN invoices i ON i.dispatch_customer_id = dc.id
       AND i.revision = dr.revision
     WHERE ${deliveredConditions}
     ORDER BY dr.request_date DESC, dr.id DESC, dc.id ASC`,
    filters.params
  );
}

async function exportSalesmanRevenue(input = {}) {
  const filters = salesmanActivityFilters(input, {
    storeColumn: 'dr.store_id',
    salesmanColumn: 'dr.salesman_id',
    dateColumn: 'dr.request_date',
    searchColumns: ['dr.dispatch_number', 's.full_name']
  });
  const deliveredConditions = [filters.where.replace(/^WHERE\s+/, ''), `dr.status IN (${DELIVERED_DISPATCH_STATUSES})`]
    .filter(Boolean)
    .join(' AND ');

  return query(
    `SELECT
       dr.id AS dispatch_request_id,
       dr.dispatch_number,
       dr.request_date AS revenue_date,
       dr.status AS dispatch_status,
       s.id AS salesman_id,
       s.full_name AS salesman_name,
       dr.total_quantity,
       dr.subtotal_amount AS sales_subtotal_amount,
       dr.vat_amount AS sales_vat_amount,
       dr.total_amount AS sales_revenue,
       dr.total_collected,
       dr.total_debt,
       COALESCE(line_summary.gift_quantity, 0) AS gift_quantity,
       COALESCE(line_summary.sales_cogs, 0) AS sales_cogs,
       COALESCE(line_summary.gift_cogs, 0) AS gift_cogs,
       dr.total_amount - COALESCE(line_summary.sales_cogs, 0) - COALESCE(line_summary.gift_cogs, 0) AS gross_profit_after_gifts
     FROM dispatch_requests dr
     JOIN salesmen s ON s.id = dr.salesman_id
     LEFT JOIN (
       SELECT di.dispatch_request_id,
         SUM(CASE WHEN di.line_type = 'free_gift' THEN di.quantity ELSE 0 END) AS gift_quantity,
         SUM(CASE
           WHEN di.line_type = 'sale' AND dla.status = 'dispatched' THEN dla.total_cost
           WHEN di.line_type = 'sale' AND dla.status = 'returned' THEN -dla.total_cost
           ELSE 0
         END) AS sales_cogs,
         SUM(CASE
           WHEN di.line_type = 'free_gift' AND dla.status = 'dispatched' THEN dla.total_cost
           WHEN di.line_type = 'free_gift' AND dla.status = 'returned' THEN -dla.total_cost
           ELSE 0
         END) AS gift_cogs
       FROM dispatch_items di
       LEFT JOIN dispatch_line_allocations dla ON dla.dispatch_item_id = di.id
       GROUP BY di.dispatch_request_id
     ) line_summary ON line_summary.dispatch_request_id = dr.id
     WHERE ${deliveredConditions}
     ORDER BY dr.request_date DESC, dr.id DESC`,
    filters.params
  );
}

async function exportSalesmen(input = {}) {
  switch (input.dataset || 'performance') {
    case 'orders':
      return exportSalesmanOrders(input);
    case 'invoices':
      return exportSalesmanInvoices(input);
    case 'delivered_customers':
      return exportDeliveredCustomers(input);
    case 'revenue':
      return exportSalesmanRevenue(input);
    case 'performance':
    default:
      return exportSalesmanPerformance(input);
  }
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
  exportSalesmen,
  findLocationById,
  findLocationTargetById,
  findActiveSalesmanSublocation,
  lockSublocationsByIds,
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
  replaceActiveSalesmanSublocations,
  sumSublocationTargets,
  unassignSalesmanSublocation,
  updateLocation,
  updateLocationTarget,
  updateSalesman,
  updateSublocation,
  _private: {
    addDateFilters,
    salesmanActivityFilters,
    salesmanBaseFilters
  }
};
