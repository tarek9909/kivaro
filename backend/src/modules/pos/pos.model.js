const { query } = require('../../bootstrap/db');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

async function execute(connection, sql, params = []) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }
  return query(sql, params);
}

async function findSalesmanByUserId(userId, storeId, connection = null) {
  const rows = await execute(connection, 'SELECT * FROM salesmen WHERE user_id = ? AND store_id = ? LIMIT 1', [userId, storeId]);
  return rows[0] || null;
}

async function findSalesmanById(id, connection = null) {
  const rows = await execute(connection, 'SELECT * FROM salesmen WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function listActiveSalesmen(storeId, connection = null) {
  return execute(connection, `SELECT id, full_name FROM salesmen
    WHERE store_id = ? AND status = 'active' ORDER BY full_name ASC, id ASC`, [storeId]);
}

async function listSalesmanTerritories(salesmanId, connection = null) {
  if (!salesmanId) return [];
  return execute(connection, `SELECT ss.id AS assignment_id, ss.salesman_id, ss.sublocation_id, ss.assigned_at,
      sl.store_id, sl.location_id, sl.name AS sublocation_name, sl.code AS sublocation_code,
      l.name AS location_name, l.code AS location_code
    FROM salesman_sublocations ss JOIN sublocations sl ON sl.id = ss.sublocation_id
    JOIN locations l ON l.id = sl.location_id
    WHERE ss.salesman_id = ? AND ss.status = 'active' AND sl.status = 'active' AND l.status = 'active'
    ORDER BY l.name ASC, sl.name ASC`, [salesmanId]);
}

async function findWarehouseById(id, connection = null) {
  const rows = await execute(connection, 'SELECT * FROM warehouses WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function listActiveWarehouses(storeId, connection = null) {
  return execute(connection, `SELECT id, name, code, status
    FROM warehouses
    WHERE store_id = ? AND status = 'active'
    ORDER BY name ASC, id ASC`, [storeId]);
}

async function findSaleCatalogEntryById(id, connection = null) {
  const rows = await execute(connection, `SELECT sce.*, item.name AS item_name, item.item_kind, item.stock_mode,
      item.kg_per_carton, item.status AS item_status, pg.name AS packaging_group_name,
      pg.status AS packaging_group_status
    FROM sale_catalog_entries sce LEFT JOIN items item ON item.id = sce.item_id
    LEFT JOIN packaging_groups pg ON pg.id = sce.packaging_group_id WHERE sce.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function listPosCatalogEntries(input = {}, connection = null) {
  const pagination = getPagination(input);
  const conditions = ['sce.store_id = ?', "sce.status = 'active'", 'sce.is_pos_active = 1'];
  const params = [input.store_id];
  if (input.entry_type) { conditions.push('sce.entry_type = ?'); params.push(input.entry_type); }
  if (input.search) {
    const term = `%${input.search}%`;
    conditions.push('(sce.display_name LIKE ? OR item.name LIKE ? OR pg.name LIKE ?)');
    params.push(term, term, term);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const joins = 'LEFT JOIN items item ON item.id = sce.item_id LEFT JOIN packaging_groups pg ON pg.id = sce.packaging_group_id';
  const executor = (sql, values) => execute(connection, sql, values);
  const count = await executor(`SELECT COUNT(*) AS total FROM sale_catalog_entries sce ${joins} ${where}`, params);
  const rows = await executor(`SELECT sce.id, sce.entry_type, sce.item_id, sce.packaging_group_id, sce.display_name,
      sce.unit_label, sce.default_price, sce.vat_rate, item.name AS item_name, pg.name AS packaging_group_name
    FROM sale_catalog_entries sce ${joins} ${where} ORDER BY sce.display_name ASC, sce.id ASC
    ${input.allRows ? '' : 'LIMIT ? OFFSET ?'}`, input.allRows ? params : [...params, pagination.limit, pagination.offset]);
  return { rows, meta: getPaginationMeta({ ...pagination, total: Number(count[0]?.total || 0) }) };
}

function workspaceDispatchFilters(input = {}) {
  const conditions = ['dr.store_id = ?', 'dr.salesman_id = ?'];
  const params = [input.store_id, input.salesman_id];
  if (input.date_from) { conditions.push('dr.request_date >= ?'); params.push(input.date_from); }
  if (input.date_to) { conditions.push('dr.request_date <= ?'); params.push(input.date_to); }
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

async function getSalesmanWorkspaceSummary(input = {}, connection = null) {
  const { where, params } = workspaceDispatchFilters(input);
  const [dispatchRows, balanceRows, commissionRows] = await Promise.all([
    execute(connection, `SELECT COUNT(*) AS dispatch_count,
       COALESCE(SUM(CASE WHEN dr.status IN ('draft', 'pending_approval', 'approved') THEN 1 ELSE 0 END), 0) AS pending_dispatch_count,
       COALESCE(SUM(CASE WHEN dr.status IN ('delivery', 'partially_settled') THEN 1 ELSE 0 END), 0) AS active_delivery_count,
       COALESCE(SUM(CASE WHEN dr.status IN ('delivery', 'partially_settled', 'completed') THEN dr.total_amount ELSE 0 END), 0) AS dispatched_revenue,
       COALESCE(SUM(CASE WHEN dr.status = 'completed' THEN dr.total_collected ELSE 0 END), 0) AS settled_collections,
       COALESCE(SUM(CASE WHEN dr.status = 'completed' THEN dr.total_debt ELSE 0 END), 0) AS settled_debt,
       COALESCE(SUM(CASE WHEN EXISTS (SELECT 1 FROM dispatch_settlements ds WHERE ds.dispatch_request_id = dr.id AND ds.status = 'draft') THEN 1 ELSE 0 END), 0) AS submitted_closeout_count
       FROM dispatch_requests dr ${where}`, params),
    execute(connection, `SELECT COALESCE(SUM(CASE WHEN status = 'open' THEN expected_amount ELSE 0 END), 0) AS open_balance_expected,
       COALESCE(SUM(CASE WHEN status = 'open' THEN collected_amount ELSE 0 END), 0) AS open_balance_collected,
       COALESCE(SUM(CASE WHEN status = 'open' THEN debt_amount ELSE 0 END), 0) AS open_balance_debt,
       COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) AS open_balance_count
       FROM salesman_balances WHERE store_id = ? AND salesman_id = ?`, [input.store_id, input.salesman_id]),
    execute(connection, `SELECT COALESCE(SUM(CASE WHEN status IN ('draft', 'approved') THEN total_commission ELSE 0 END), 0) AS pending_commission,
       COALESCE(SUM(CASE WHEN status = 'paid' THEN total_commission ELSE 0 END), 0) AS paid_commission,
       COALESCE(SUM(CASE WHEN status IN ('draft', 'approved') THEN 1 ELSE 0 END), 0) AS pending_commission_count
       FROM commission_calculations WHERE store_id = ? AND salesman_id = ?`, [input.store_id, input.salesman_id])
  ]);
  return { ...(dispatchRows[0] || {}), ...(balanceRows[0] || {}), ...(commissionRows[0] || {}) };
}

async function listSalesmanWorkspaceDispatches(input = {}, connection = null) {
  const { where, params } = workspaceDispatchFilters(input);
  const limit = Math.min(Math.max(Number(input.limit || 20), 1), 100);
  return execute(connection, `SELECT dr.*, w.name AS warehouse_name, COALESCE(customer_summary.customer_count, 0) AS customer_count,
      COALESCE(return_summary.returned_quantity, 0) AS returned_quantity, settlement.id AS settlement_id,
      settlement.status AS settlement_status, settlement.total_collected AS settlement_collected,
      settlement.total_debt AS settlement_debt, settlement.settlement_date
    FROM dispatch_requests dr JOIN warehouses w ON w.id = dr.warehouse_id
    LEFT JOIN (SELECT dispatch_request_id, COUNT(*) AS customer_count FROM dispatch_customers GROUP BY dispatch_request_id) customer_summary ON customer_summary.dispatch_request_id = dr.id
    LEFT JOIN (SELECT dispatch_request_id, SUM(returned_quantity) AS returned_quantity FROM dispatch_returns GROUP BY dispatch_request_id) return_summary ON return_summary.dispatch_request_id = dr.id
    LEFT JOIN (SELECT ds.* FROM dispatch_settlements ds JOIN (SELECT dispatch_request_id, MAX(id) AS id FROM dispatch_settlements GROUP BY dispatch_request_id) latest ON latest.id = ds.id) settlement ON settlement.dispatch_request_id = dr.id
    ${where} ORDER BY COALESCE(dr.dispatched_at, dr.request_date) DESC, dr.id DESC LIMIT ?`, [...params, limit]);
}

async function listSalesmanWorkspaceDebts(input = {}, connection = null) {
  const conditions = ['cd.store_id = ?', 'dr.salesman_id = ?'];
  const params = [input.store_id, input.salesman_id];
  if (input.date_from) { conditions.push('cd.debt_date >= ?'); params.push(input.date_from); }
  if (input.date_to) { conditions.push('cd.debt_date <= ?'); params.push(input.date_to); }
  const limit = Math.min(Math.max(Number(input.limit || 20), 1), 100);
  return execute(connection, `SELECT cd.*, c.name AS customer_name, dr.dispatch_number FROM customer_debts cd
    JOIN dispatch_requests dr ON dr.id = cd.dispatch_request_id JOIN customers c ON c.id = cd.customer_id
    WHERE ${conditions.join(' AND ')} ORDER BY cd.debt_date DESC, cd.id DESC LIMIT ?`, [...params, limit]);
}

async function listSalesmanWorkspaceCommissions(input = {}, connection = null) {
  const limit = Math.min(Math.max(Number(input.limit || 20), 1), 100);
  return execute(connection, `SELECT cc.*, sl.name AS sublocation_name, COALESCE(payment_summary.paid_amount, 0) AS paid_amount
    FROM commission_calculations cc JOIN sublocations sl ON sl.id = cc.sublocation_id
    LEFT JOIN (SELECT commission_calculation_id, SUM(amount) AS paid_amount FROM commission_payments GROUP BY commission_calculation_id) payment_summary ON payment_summary.commission_calculation_id = cc.id
    WHERE cc.store_id = ? AND cc.salesman_id = ? ORDER BY cc.period_end DESC, cc.id DESC LIMIT ?`, [input.store_id, input.salesman_id, limit]);
}

async function listSalesmanWorkspaceTargets(input = {}, connection = null) {
  return execute(connection, `SELECT st.id AS salesman_target_id, st.store_id, st.salesman_id, l.name AS location_name,
      sl.name AS sublocation_name, lt.target_period, lt.period_start, lt.period_end, st.target_amount, st.status,
      COALESCE(SUM(tcc.amount), 0) AS achieved_sales_amount,
      CASE WHEN st.target_amount = 0 THEN 0 ELSE ROUND((COALESCE(SUM(tcc.amount), 0) / st.target_amount) * 100, 2) END AS achievement_percentage
    FROM salesman_targets st
    JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
    JOIN location_targets lt ON lt.id = slt.location_target_id
    JOIN sublocations sl ON sl.id = slt.sublocation_id
    JOIN locations l ON l.id = lt.location_id
    LEFT JOIN target_collection_credits tcc ON tcc.salesman_target_id = st.id
    WHERE st.store_id = ? AND st.salesman_id = ?
    GROUP BY st.id, st.store_id, st.salesman_id, l.name, sl.name, lt.target_period, lt.period_start, lt.period_end, st.target_amount, st.status
    ORDER BY lt.period_end DESC, l.name ASC, sl.name ASC LIMIT 100`, [input.store_id, input.salesman_id]);
}

module.exports = { findSaleCatalogEntryById, findSalesmanById, findSalesmanByUserId, findWarehouseById,
  listActiveWarehouses,
  listActiveSalesmen, listPosCatalogEntries, listSalesmanTerritories, listSalesmanWorkspaceCommissions,
  listSalesmanWorkspaceDebts, listSalesmanWorkspaceDispatches, listSalesmanWorkspaceTargets, getSalesmanWorkspaceSummary };
