const { query } = require('../../bootstrap/db');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

function nullable(value) {
  return value === undefined || value === '' ? null : value;
}

async function execute(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }

  return query(sql, params);
}

const orderSelect = `
  po.*,
  s.full_name AS salesman_name,
  s.user_id AS salesman_user_id,
  w.name AS warehouse_name,
  c.name AS customer_name,
  c.phone AS customer_phone,
  l.name AS location_name,
  sl.name AS sublocation_name
`;

const orderJoins = `
  JOIN salesmen s ON s.id = po.salesman_id
  JOIN warehouses w ON w.id = po.warehouse_id
  JOIN customers c ON c.id = po.customer_id
  JOIN locations l ON l.id = po.location_id
  JOIN sublocations sl ON sl.id = po.sublocation_id
`;

function orderFilters(input = {}) {
  const conditions = [];
  const params = [];
  const exact = [
    ['store_id', 'po.store_id'],
    ['salesman_id', 'po.salesman_id'],
    ['customer_id', 'po.customer_id'],
    ['warehouse_id', 'po.warehouse_id'],
    ['status', 'po.status']
  ];

  for (const [key, column] of exact) {
    if (input[key] === undefined || input[key] === null || input[key] === '') continue;
    conditions.push(`${column} = ?`);
    params.push(input[key]);
  }

  if (input.date_from) {
    conditions.push('po.order_date >= ?');
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push('po.order_date <= ?');
    params.push(input.date_to);
  }
  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push(`(
      po.order_number LIKE ?
      OR s.full_name LIKE ?
      OR c.name LIKE ?
      OR c.phone LIKE ?
    )`);
    params.push(term, term, term, term);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

async function listOrders(input = {}, connection = null) {
  const pagination = getPagination(input);
  const { where, params } = orderFilters(input);
  const executor = (sql, values) => execute(connection, sql, values);
  const count = await executor(
    `SELECT COUNT(*) AS total
     FROM pos_orders po
     ${orderJoins}
     ${where}`,
    params
  );
  const rows = await executor(
    `SELECT ${orderSelect}
     FROM pos_orders po
     ${orderJoins}
     ${where}
     ORDER BY po.created_at DESC, po.id DESC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );

  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function findOrderById(id, connection = null, lock = false) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  const rows = await execute(
    connection,
    `SELECT ${orderSelect}
     FROM pos_orders po
     ${orderJoins}
     WHERE po.id = ?
     LIMIT 1${suffix}`,
    [id]
  );
  return rows[0] || null;
}

async function findOrdersByIds(ids, connection = null, lock = false) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  return execute(
    connection,
    `SELECT ${orderSelect}
     FROM pos_orders po
     ${orderJoins}
     WHERE po.id IN (${placeholders})
     ORDER BY po.id ASC${suffix}`,
    ids
  );
}

async function getOrderLines(orderId, connection = null, lock = false) {
  const suffix = connection && lock ? ' FOR UPDATE' : '';
  return execute(
    connection,
    `SELECT
       pol.*,
       sce.display_name AS catalog_display_name,
       sce.unit_label AS catalog_unit_label,
       sce.status AS catalog_status,
       sce.is_pos_active AS catalog_is_pos_active,
       item.name AS item_name,
       pg.name AS packaging_group_name
     FROM pos_order_lines pol
     JOIN sale_catalog_entries sce ON sce.id = pol.sale_catalog_entry_id
     LEFT JOIN items item ON item.id = pol.item_id
     LEFT JOIN packaging_groups pg ON pg.id = pol.packaging_group_id
     WHERE pol.pos_order_id = ?
     ORDER BY pol.id ASC${suffix}`,
    [orderId]
  );
}

async function getOrderLinesForOrderIds(orderIds, connection = null) {
  if (!orderIds.length) return new Map();
  const placeholders = orderIds.map(() => '?').join(', ');
  const rows = await execute(
    connection,
    `SELECT
       pol.*,
       sce.display_name AS catalog_display_name,
       sce.unit_label AS catalog_unit_label,
       sce.status AS catalog_status,
       sce.is_pos_active AS catalog_is_pos_active,
       item.name AS item_name,
       pg.name AS packaging_group_name
     FROM pos_order_lines pol
     JOIN sale_catalog_entries sce ON sce.id = pol.sale_catalog_entry_id
     LEFT JOIN items item ON item.id = pol.item_id
     LEFT JOIN packaging_groups pg ON pg.id = pol.packaging_group_id
     WHERE pol.pos_order_id IN (${placeholders})
     ORDER BY pol.pos_order_id ASC, pol.id ASC`,
    orderIds
  );

  const byOrderId = new Map(orderIds.map((id) => [Number(id), []]));
  for (const row of rows) {
    byOrderId.get(Number(row.pos_order_id))?.push(row);
  }
  return byOrderId;
}

async function getOrderEvents(orderId, connection = null) {
  return execute(
    connection,
    `SELECT poe.*, u.full_name AS actor_name
     FROM pos_order_events poe
     LEFT JOIN users u ON u.id = poe.actor_user_id
     WHERE poe.pos_order_id = ?
     ORDER BY poe.created_at ASC, poe.id ASC`,
    [orderId]
  );
}

async function getOrderDispatchLinks(orderId, connection = null) {
  return execute(
    connection,
    `SELECT podl.*, dr.dispatch_number, dr.status AS dispatch_status
     FROM pos_order_dispatch_links podl
     JOIN dispatch_requests dr ON dr.id = podl.dispatch_request_id
     WHERE podl.pos_order_id = ?
     ORDER BY podl.created_at ASC`,
    [orderId]
  );
}

async function findSalesmanByUserId(userId, storeId, connection = null) {
  const rows = await execute(
    connection,
    `SELECT *
     FROM salesmen
     WHERE user_id = ? AND store_id = ?
     LIMIT 1`,
    [userId, storeId]
  );
  return rows[0] || null;
}

async function findSalesmanById(id, connection = null) {
  const rows = await execute(connection, 'SELECT * FROM salesmen WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function listSalesmanTerritories(salesmanId, connection = null) {
  return execute(
    connection,
    `SELECT
       ss.id AS assignment_id,
       ss.salesman_id,
       ss.sublocation_id,
       ss.assigned_at,
       sl.store_id,
       sl.location_id,
       sl.name AS sublocation_name,
       sl.code AS sublocation_code,
       l.name AS location_name,
       l.code AS location_code
     FROM salesman_sublocations ss
     JOIN sublocations sl ON sl.id = ss.sublocation_id
     JOIN locations l ON l.id = sl.location_id
     WHERE ss.salesman_id = ?
       AND ss.status = 'active'
       AND sl.status = 'active'
       AND l.status = 'active'
     ORDER BY l.name ASC, sl.name ASC`,
    [salesmanId]
  );
}

async function findWarehouseById(id, connection = null) {
  const rows = await execute(connection, 'SELECT * FROM warehouses WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function findCustomerById(id, connection = null) {
  const rows = await execute(
    connection,
    `SELECT
       c.*,
       l.name AS location_name,
       sl.name AS sublocation_name
     FROM customers c
     JOIN locations l ON l.id = c.location_id
     JOIN sublocations sl ON sl.id = c.sublocation_id
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findSaleCatalogEntryById(id, connection = null) {
  const rows = await execute(
    connection,
    `SELECT
       sce.*,
       item.name AS item_name,
       item.item_kind,
       item.stock_mode,
       item.kg_per_carton,
       item.loose_units_per_carton,
       item.status AS item_status,
       pg.name AS packaging_group_name,
       pg.status AS packaging_group_status
     FROM sale_catalog_entries sce
     LEFT JOIN items item ON item.id = sce.item_id
     LEFT JOIN packaging_groups pg ON pg.id = sce.packaging_group_id
     WHERE sce.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function listPosCatalogEntries(input = {}, connection = null) {
  const pagination = getPagination(input);
  const conditions = [
    'sce.store_id = ?',
    "sce.status = 'active'",
    'sce.is_pos_active = 1'
  ];
  const params = [input.store_id];
  if (input.entry_type) {
    conditions.push('sce.entry_type = ?');
    params.push(input.entry_type);
  }
  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push('(sce.display_name LIKE ? OR item.name LIKE ? OR pg.name LIKE ?)');
    params.push(term, term, term);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const executor = (sql, values) => execute(connection, sql, values);
  const joins = `
    LEFT JOIN items item ON item.id = sce.item_id
    LEFT JOIN packaging_groups pg ON pg.id = sce.packaging_group_id`;
  const count = await executor(
    `SELECT COUNT(*) AS total FROM sale_catalog_entries sce ${joins} ${where}`,
    params
  );
  const rows = await executor(
    `SELECT
       sce.id,
       sce.entry_type,
       sce.item_id,
       sce.packaging_group_id,
       sce.display_name,
       sce.unit_label,
       sce.default_price,
       sce.vat_rate,
       item.name AS item_name,
       pg.name AS packaging_group_name
     FROM sale_catalog_entries sce
     ${joins}
     ${where}
     ORDER BY sce.display_name ASC, sce.id ASC
     ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`,
    input.allRows ? params : [...params, pagination.limit, pagination.offset]
  );
  return {
    rows,
    meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) })
  };
}

async function createOrder(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO pos_orders (
       store_id, order_number, salesman_id, warehouse_id, customer_id, location_id,
       sublocation_id, status, order_date, notes, created_by, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [
      data.store_id,
      data.order_number,
      data.salesman_id,
      data.warehouse_id,
      data.customer_id,
      data.location_id,
      data.sublocation_id,
      data.order_date,
      nullable(data.notes),
      nullable(data.created_by),
      nullable(data.updated_by)
    ]
  );
  return result.insertId;
}

async function updateOrder(connection, id, data) {
  const allowed = [
    'warehouse_id',
    'customer_id',
    'location_id',
    'sublocation_id',
    'order_date',
    'notes',
    'updated_by'
  ];
  const entries = allowed
    .filter((key) => data[key] !== undefined)
    .map((key) => [key, data[key]]);
  if (!entries.length) return;

  await connection.execute(
    `UPDATE pos_orders
     SET ${entries.map(([key]) => `${key} = ?`).join(', ')}
     WHERE id = ?`,
    [...entries.map(([, value]) => nullable(value)), id]
  );
}

async function setOrderStatus(connection, id, data) {
  const allowed = [
    'status',
    'dispatch_request_id',
    'updated_by',
    'accepted_by',
    'accepted_at',
    'cancelled_by',
    'cancelled_at'
  ];
  const entries = allowed
    .filter((key) => data[key] !== undefined)
    .map((key) => [key, data[key]]);
  if (!entries.length) return;
  await connection.execute(
    `UPDATE pos_orders
     SET ${entries.map(([key]) => `${key} = ?`).join(', ')}
     WHERE id = ?`,
    [...entries.map(([, value]) => nullable(value)), id]
  );
}

async function replaceOrderLines(connection, orderId, lines) {
  await connection.execute('DELETE FROM pos_order_lines WHERE pos_order_id = ?', [orderId]);
  for (const line of lines) {
    await connection.execute(
      `INSERT INTO pos_order_lines (
         pos_order_id, sale_catalog_entry_id, item_id, packaging_group_id, line_type,
         fulfillment_type, quantity, unit_price, vat_rate, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        line.sale_catalog_entry_id,
        nullable(line.item_id),
        nullable(line.packaging_group_id),
        line.line_type,
        line.fulfillment_type,
        line.quantity,
        line.unit_price,
        line.vat_rate,
        nullable(line.notes)
      ]
    );
  }
}

async function removeOrderLines(connection, lineIds) {
  if (!lineIds.length) return;
  const placeholders = lineIds.map(() => '?').join(', ');
  await connection.execute(
    `DELETE FROM pos_order_lines WHERE id IN (${placeholders})`,
    lineIds
  );
}

async function createOrderEvent(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO pos_order_events (
       store_id, pos_order_id, event_type, actor_user_id, old_values_json, new_values_json, notes
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.pos_order_id,
      data.event_type,
      nullable(data.actor_user_id),
      data.old_values_json === undefined ? null : JSON.stringify(data.old_values_json),
      data.new_values_json === undefined ? null : JSON.stringify(data.new_values_json),
      nullable(data.notes)
    ]
  );
  return result.insertId;
}

async function lockDispatchRequest(connection, id) {
  const [rows] = await connection.execute(
    'SELECT * FROM dispatch_requests WHERE id = ? LIMIT 1 FOR UPDATE',
    [id]
  );
  return rows[0] || null;
}

async function linkOrderToDispatch(connection, orderId, dispatchRequestId) {
  await connection.execute(
    `INSERT INTO pos_order_dispatch_links (pos_order_id, dispatch_request_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE dispatch_request_id = VALUES(dispatch_request_id)`,
    [orderId, dispatchRequestId]
  );
}

function workspaceDispatchFilters(input = {}) {
  const conditions = ['dr.store_id = ?', 'dr.salesman_id = ?'];
  const params = [input.store_id, input.salesman_id];
  if (input.date_from) {
    conditions.push('dr.request_date >= ?');
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push('dr.request_date <= ?');
    params.push(input.date_to);
  }
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

async function getSalesmanWorkspaceSummary(input = {}, connection = null) {
  const { where, params } = workspaceDispatchFilters(input);
  const [dispatchRows, balanceRows, commissionRows, orderRows] = await Promise.all([
    execute(
      connection,
      `SELECT
         COUNT(*) AS dispatch_count,
         COALESCE(SUM(CASE WHEN dr.status IN ('draft', 'pending_approval', 'approved') THEN 1 ELSE 0 END), 0) AS pending_dispatch_count,
         COALESCE(SUM(CASE WHEN dr.status IN ('dispatched', 'partially_settled') THEN 1 ELSE 0 END), 0) AS active_delivery_count,
         COALESCE(SUM(CASE WHEN dr.status IN ('dispatched', 'partially_settled', 'completed') THEN dr.total_amount ELSE 0 END), 0) AS dispatched_revenue,
         COALESCE(SUM(CASE WHEN dr.status = 'completed' THEN dr.total_collected ELSE 0 END), 0) AS settled_collections,
         COALESCE(SUM(CASE WHEN dr.status = 'completed' THEN dr.total_debt ELSE 0 END), 0) AS settled_debt,
         COALESCE(SUM(CASE WHEN EXISTS (
           SELECT 1 FROM dispatch_settlements ds
           WHERE ds.dispatch_request_id = dr.id AND ds.status = 'draft'
         ) THEN 1 ELSE 0 END), 0) AS submitted_closeout_count
       FROM dispatch_requests dr
       ${where}`,
      params
    ),
    execute(
      connection,
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'open' THEN expected_amount ELSE 0 END), 0) AS open_balance_expected,
         COALESCE(SUM(CASE WHEN status = 'open' THEN collected_amount ELSE 0 END), 0) AS open_balance_collected,
         COALESCE(SUM(CASE WHEN status = 'open' THEN debt_amount ELSE 0 END), 0) AS open_balance_debt,
         COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) AS open_balance_count
       FROM salesman_balances
       WHERE store_id = ? AND salesman_id = ?`,
      [input.store_id, input.salesman_id]
    ),
    execute(
      connection,
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('draft', 'approved') THEN total_commission ELSE 0 END), 0) AS pending_commission,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total_commission ELSE 0 END), 0) AS paid_commission,
         COALESCE(SUM(CASE WHEN status IN ('draft', 'approved') THEN 1 ELSE 0 END), 0) AS pending_commission_count
       FROM commission_calculations
       WHERE store_id = ? AND salesman_id = ?`,
      [input.store_id, input.salesman_id]
    ),
    execute(
      connection,
      `SELECT
         COALESCE(SUM(status = 'pending'), 0) AS pending_order_count,
         COALESCE(SUM(status = 'converted'), 0) AS converted_order_count,
         COUNT(*) AS order_count
       FROM pos_orders
       WHERE store_id = ? AND salesman_id = ?`,
      [input.store_id, input.salesman_id]
    )
  ]);

  return {
    ...(dispatchRows[0] || {}),
    ...(balanceRows[0] || {}),
    ...(commissionRows[0] || {}),
    ...(orderRows[0] || {})
  };
}

async function listSalesmanWorkspaceDispatches(input = {}, connection = null) {
  const { where, params } = workspaceDispatchFilters(input);
  const limit = Math.min(Math.max(Number(input.limit || 20), 1), 100);
  return execute(
    connection,
    `SELECT
       dr.*, w.name AS warehouse_name,
       COALESCE(customer_summary.customer_count, 0) AS customer_count,
       COALESCE(return_summary.returned_quantity, 0) AS returned_quantity,
       settlement.id AS settlement_id,
       settlement.status AS settlement_status,
       settlement.total_collected AS settlement_collected,
       settlement.total_debt AS settlement_debt,
       settlement.settlement_date
     FROM dispatch_requests dr
     JOIN warehouses w ON w.id = dr.warehouse_id
     LEFT JOIN (
       SELECT dispatch_request_id, COUNT(*) AS customer_count
       FROM dispatch_customers
       GROUP BY dispatch_request_id
     ) customer_summary ON customer_summary.dispatch_request_id = dr.id
     LEFT JOIN (
       SELECT dispatch_request_id, SUM(returned_quantity) AS returned_quantity
       FROM dispatch_returns
       GROUP BY dispatch_request_id
     ) return_summary ON return_summary.dispatch_request_id = dr.id
     LEFT JOIN (
       SELECT ds.*
       FROM dispatch_settlements ds
       JOIN (
         SELECT dispatch_request_id, MAX(id) AS id
         FROM dispatch_settlements
         GROUP BY dispatch_request_id
       ) latest ON latest.id = ds.id
     ) settlement ON settlement.dispatch_request_id = dr.id
     ${where}
     ORDER BY COALESCE(dr.dispatched_at, dr.request_date) DESC, dr.id DESC
     LIMIT ?`,
    [...params, limit]
  );
}

async function listSalesmanWorkspaceDebts(input = {}, connection = null) {
  const conditions = ['cd.store_id = ?', 'dr.salesman_id = ?'];
  const params = [input.store_id, input.salesman_id];
  if (input.date_from) {
    conditions.push('cd.debt_date >= ?');
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push('cd.debt_date <= ?');
    params.push(input.date_to);
  }
  const limit = Math.min(Math.max(Number(input.limit || 20), 1), 100);
  return execute(
    connection,
    `SELECT cd.*, c.name AS customer_name, dr.dispatch_number
     FROM customer_debts cd
     JOIN dispatch_requests dr ON dr.id = cd.dispatch_request_id
     JOIN customers c ON c.id = cd.customer_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY cd.debt_date DESC, cd.id DESC
     LIMIT ?`,
    [...params, limit]
  );
}

async function listSalesmanWorkspaceCommissions(input = {}, connection = null) {
  const limit = Math.min(Math.max(Number(input.limit || 20), 1), 100);
  return execute(
    connection,
    `SELECT cc.*, sl.name AS sublocation_name,
       COALESCE(payment_summary.paid_amount, 0) AS paid_amount
     FROM commission_calculations cc
     JOIN sublocations sl ON sl.id = cc.sublocation_id
     LEFT JOIN (
       SELECT commission_calculation_id, SUM(amount) AS paid_amount
       FROM commission_payments
       GROUP BY commission_calculation_id
     ) payment_summary ON payment_summary.commission_calculation_id = cc.id
     WHERE cc.store_id = ? AND cc.salesman_id = ?
     ORDER BY cc.period_end DESC, cc.id DESC
     LIMIT ?`,
    [input.store_id, input.salesman_id, limit]
  );
}

async function listSalesmanWorkspaceTargets(input = {}, connection = null) {
  return execute(
    connection,
    `SELECT *
     FROM v_salesman_target_progress
     WHERE store_id = ? AND salesman_id = ?
     ORDER BY period_end DESC, location_name ASC, sublocation_name ASC
     LIMIT 100`,
    [input.store_id, input.salesman_id]
  );
}

module.exports = {
  createOrder,
  createOrderEvent,
  findCustomerById,
  findOrderById,
  findOrdersByIds,
  findSaleCatalogEntryById,
  findSalesmanById,
  findSalesmanByUserId,
  findWarehouseById,
  getOrderDispatchLinks,
  getOrderEvents,
  getOrderLines,
  getOrderLinesForOrderIds,
  linkOrderToDispatch,
  listOrders,
  listPosCatalogEntries,
  listSalesmanTerritories,
  listSalesmanWorkspaceCommissions,
  listSalesmanWorkspaceDebts,
  listSalesmanWorkspaceDispatches,
  listSalesmanWorkspaceTargets,
  getSalesmanWorkspaceSummary,
  lockDispatchRequest,
  removeOrderLines,
  replaceOrderLines,
  setOrderStatus,
  updateOrder
};
