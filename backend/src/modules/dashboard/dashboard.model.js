const { query } = require('../../bootstrap/db');

function sql(parts) {
  return parts.filter(Boolean).join('\n');
}

function addDateRange(filters = {}, column, conditions, params) {
  if (filters.date_from) {
    conditions.push('DATE(' + column + ') >= ?');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    conditions.push('DATE(' + column + ') <= ?');
    params.push(filters.date_to);
  }
}

function physicalDispatchConditions(storeId, filters, alias = 'dr') {
  const conditions = [
    alias + '.store_id = ?',
    alias + ".status IN ('dispatched', 'partially_settled', 'completed')"
  ];
  const params = [storeId];
  addDateRange(filters, 'COALESCE(' + alias + '.dispatched_at, ' + alias + '.request_date)', conditions, params);
  return { conditions, params };
}

function packagingShortageQuery() {
  return sql([
    'SELECT req.store_id, req.packaging_group_id, req.packaging_group_name, req.warehouse_id,',
    '  req.component_role, req.item_id, req.required_quantity, i.name AS item_name, i.code AS item_code,',
    '  COALESCE(sb.quantity_on_hand, 0) AS quantity_on_hand,',
    '  COALESCE(sb.quantity_reserved, 0) AS quantity_reserved,',
    '  COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) AS available_quantity,',
    '  GREATEST(req.required_quantity - COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0), 0) AS shortage_quantity',
    'FROM (',
    '  SELECT pg.store_id, pg.id AS packaging_group_id, pg.name AS packaging_group_name,',
    "    pg.default_warehouse_id AS warehouse_id, 'raw_input' AS component_role, pg.input_item_id AS item_id,",
    '    inner_component.quantity_per_outer * inner_item.max_content_weight_kg AS required_quantity',
    '  FROM packaging_groups pg',
    '  JOIN packaging_group_components inner_component',
    "    ON inner_component.packaging_group_id = pg.id AND inner_component.component_role = 'inner_sellable'",
    '  JOIN items inner_item ON inner_item.id = inner_component.item_id',
    "  WHERE pg.status = 'active'",
    '  UNION ALL',
    '  SELECT pg.store_id, pg.id, pg.name, pg.default_warehouse_id, pgc.component_role, pgc.item_id, pgc.quantity_per_outer',
    '  FROM packaging_groups pg',
    '  JOIN packaging_group_components pgc ON pgc.packaging_group_id = pg.id',
    "  WHERE pg.status = 'active'",
    ') req',
    'JOIN items i ON i.id = req.item_id',
    'LEFT JOIN item_stock_balances sb ON sb.warehouse_id = req.warehouse_id AND sb.item_id = req.item_id',
    'WHERE req.warehouse_id IS NOT NULL',
    '  AND COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) < req.required_quantity'
  ]);
}

async function getSummary(storeId, filters = {}) {
  const collectionConditions = ["ds.store_id = ?", "ds.status = 'posted'"];
  const collectionParams = [storeId];
  addDateRange(filters, 'ds.settlement_date', collectionConditions, collectionParams);
  const rows = await query(
    sql([
      'SELECT',
      '  COALESCE((SELECT SUM(b.stock_value) FROM item_stock_balances b JOIN items i ON i.id = b.item_id WHERE b.store_id = ? AND i.item_kind = \'normal\'), 0) AS raw_stock_value,',
      '  COALESCE((SELECT SUM(b.stock_value) FROM item_stock_balances b JOIN items i ON i.id = b.item_id WHERE b.store_id = ? AND i.item_kind = \'packaging\'), 0) AS packaging_stock_value,',
      '  COALESCE((SELECT SUM(c.remaining_cost) FROM ready_stock_containers c WHERE c.store_id = ? AND c.status IN (\'full\', \'partial\')), 0) AS ready_stock_value,',
      '  COALESCE((SELECT SUM(ca.current_balance) FROM cash_accounts ca WHERE ca.store_id = ? AND ca.status = \'active\'), 0) AS cash_balance,',
      '  COALESCE((SELECT SUM(cd.remaining_amount) FROM customer_debts cd WHERE cd.store_id = ? AND cd.status IN (\'pending\', \'partially_paid\')), 0) AS open_receivables,',
      '  (SELECT COUNT(*) FROM dispatch_requests dr WHERE dr.store_id = ? AND dr.status IN (\'pending_approval\', \'approved\', \'dispatched\', \'partially_settled\')) AS active_dispatches,',
      '  (SELECT COUNT(*) FROM item_stock_balances b JOIN items i ON i.id = b.item_id',
      '    WHERE b.store_id = ? AND i.reorder_level > 0 AND b.quantity_on_hand - b.quantity_reserved <= i.reorder_level) AS low_stock_balances,',
      '  (SELECT COUNT(*) FROM item_stock_balances b WHERE b.store_id = ?) AS stock_balance_count,',
      '  (SELECT COUNT(*) FROM pos_orders po WHERE po.store_id = ? AND po.status = \'pending\') AS pending_pos_orders,',
      '  (SELECT COUNT(DISTINCT po.salesman_id) FROM pos_orders po WHERE po.store_id = ? AND po.status = \'pending\') AS pending_pos_salesmen,',
      '  COALESCE((SELECT SUM(ds.total_collected) FROM dispatch_settlements ds WHERE ' + collectionConditions.join(' AND ') + '), 0) AS collections'
    ]),
    [
      storeId,
      storeId,
      storeId,
      storeId,
      storeId,
      storeId,
      storeId,
      storeId,
      storeId,
      storeId,
      ...collectionParams
    ]
  );
  return rows[0] || {};
}

async function getFinancialSummary(storeId, filters = {}) {
  const dispatchScope = physicalDispatchConditions(storeId, filters, 'dr');
  const expenseConditions = ['e.store_id = ?'];
  const expenseParams = [storeId];
  const commissionConditions = ['cp.store_id = ?'];
  const commissionParams = [storeId];
  const writeoffConditions = ["cda.store_id = ?", "cda.adjustment_type = 'write_off'"];
  const writeoffParams = [storeId];
  addDateRange(filters, 'e.expense_date', expenseConditions, expenseParams);
  addDateRange(filters, 'cp.payment_date', commissionConditions, commissionParams);
  addDateRange(filters, 'cda.adjustment_date', writeoffConditions, writeoffParams);
  const rows = await query(
    sql([
      'SELECT sales.sales_revenue, sales.sales_cogs, sales.gift_cogs,',
      '  expenses.operating_expenses, commissions.commission_expenses, writeoffs.debt_write_offs,',
      '  (sales.sales_revenue - sales.sales_cogs - sales.gift_cogs) AS gross_profit_after_gifts,',
      '  (sales.sales_revenue - sales.sales_cogs - sales.gift_cogs - expenses.operating_expenses - commissions.commission_expenses - writeoffs.debt_write_offs) AS net_profit',
      'FROM (',
      '  SELECT',
      "    COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END), 0) AS sales_revenue,",
      "    COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0) AS sales_cogs,",
      "    COALESCE(SUM(CASE WHEN di.line_type = 'free_gift' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0) AS gift_cogs",
      '  FROM dispatch_requests dr',
      '  JOIN dispatch_items di ON di.dispatch_request_id = dr.id',
      '  LEFT JOIN (',
      "    SELECT dispatch_item_id, SUM(CASE WHEN status = 'dispatched' THEN total_cost ELSE 0 END) AS dispatched_cost",
      '    FROM dispatch_line_allocations',
      '    GROUP BY dispatch_item_id',
      '  ) allocation_summary ON allocation_summary.dispatch_item_id = di.id',
      '  WHERE ' + dispatchScope.conditions.join(' AND '),
      ') sales',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(e.amount), 0) AS operating_expenses FROM expenses e',
      '  WHERE ' + expenseConditions.join(' AND '),
      ') expenses',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(cp.amount), 0) AS commission_expenses FROM commission_payments cp',
      '  WHERE ' + commissionConditions.join(' AND '),
      ') commissions',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(cda.amount), 0) AS debt_write_offs FROM customer_debt_adjustments cda',
      '  WHERE ' + writeoffConditions.join(' AND '),
      ') writeoffs'
    ]),
    [
      ...dispatchScope.params,
      ...expenseParams,
      ...commissionParams,
      ...writeoffParams
    ]
  );
  return rows[0] || {};
}

async function getBenchmarks(storeId, filters = {}) {
  const requestConditions = ['dr.store_id = ?', "dr.status <> 'draft'", "dr.status <> 'cancelled'"];
  const requestParams = [storeId];
  addDateRange(filters, 'dr.request_date', requestConditions, requestParams);
  const dispatchedScope = physicalDispatchConditions(storeId, filters, 'dr');
  const posConditions = ['po.store_id = ?', "po.status NOT IN ('cancelled', 'rejected')"];
  const posParams = [storeId];
  addDateRange(filters, 'po.order_date', posConditions, posParams);
  const collectionConditions = ["ds.store_id = ?", "ds.status = 'posted'"];
  const collectionParams = [storeId];
  addDateRange(filters, 'ds.settlement_date', collectionConditions, collectionParams);
  const rows = await query(
    sql([
      'SELECT',
      '  (SELECT COUNT(*) FROM dispatch_requests dr WHERE ' + requestConditions.join(' AND ') + ') AS dispatch_total,',
      '  (SELECT COUNT(*) FROM dispatch_requests dr WHERE ' + dispatchedScope.conditions.join(' AND ') + ') AS dispatch_done,',
      '  (SELECT COUNT(*) FROM pos_orders po WHERE ' + posConditions.join(' AND ') + ') AS pos_total,',
      '  (SELECT COUNT(*) FROM pos_orders po WHERE ' + posConditions.join(' AND ') + " AND po.status = 'converted') AS pos_converted,",
      '  (SELECT COUNT(*) FROM item_stock_balances b WHERE b.store_id = ?) AS stock_total,',
      '  (SELECT COUNT(*) FROM item_stock_balances b JOIN items i ON i.id = b.item_id',
      '    WHERE b.store_id = ? AND i.reorder_level > 0 AND b.quantity_on_hand - b.quantity_reserved <= i.reorder_level) AS low_stock,',
      '  COALESCE((SELECT SUM(dr.total_amount) FROM dispatch_requests dr WHERE ' + dispatchedScope.conditions.join(' AND ') + '), 0) AS dispatched_value,',
      '  COALESCE((SELECT SUM(ds.total_collected) FROM dispatch_settlements ds WHERE ' + collectionConditions.join(' AND ') + '), 0) AS collected_value'
    ]),
    [
      ...requestParams,
      ...dispatchedScope.params,
      ...posParams,
      ...posParams,
      storeId,
      storeId,
      ...dispatchedScope.params,
      ...collectionParams
    ]
  );
  return rows[0] || {};
}

async function getActivity(storeId, limit = 8) {
  return query(
    sql([
      'SELECT activity.*',
      'FROM (',
      '  SELECT ism.id, ism.store_id, ism.movement_type, ism.quantity_change, ism.reference_type, ism.reference_id,',
      "    'item' AS source, ism.created_at, w.name AS warehouse_name, i.name AS item_name, u.symbol AS unit_label",
      '  FROM item_stock_movements ism',
      '  JOIN warehouses w ON w.id = ism.warehouse_id',
      '  JOIN items i ON i.id = ism.item_id',
      '  JOIN units u ON u.id = i.base_unit_id',
      '  WHERE ism.store_id = ?',
      '  UNION ALL',
      '  SELECT rsm.id, rsm.store_id, rsm.movement_type, rsm.inner_quantity_change AS quantity_change,',
      '    rsm.reference_type, rsm.reference_id, \'ready_stock\' AS source, rsm.created_at,',
      "    w.name AS warehouse_name, rsc.inner_name_snapshot AS item_name, 'inner unit' AS unit_label",
      '  FROM ready_stock_movements rsm',
      '  JOIN ready_stock_containers rsc ON rsc.id = rsm.ready_stock_container_id',
      '  JOIN warehouses w ON w.id = rsm.warehouse_id',
      '  WHERE rsm.store_id = ?',
      ') activity',
      'ORDER BY activity.created_at DESC, activity.source ASC, activity.id DESC',
      'LIMIT ?'
    ]),
    [storeId, storeId, limit]
  );
}

async function getPackagingShortages(storeId, limit = 8) {
  return query(
    sql([
      'SELECT shortages.*',
      'FROM (',
      packagingShortageQuery(),
      ') shortages',
      'WHERE shortages.store_id = ?',
      'ORDER BY shortages.shortage_quantity DESC, shortages.packaging_group_name ASC, shortages.item_name ASC',
      'LIMIT ?'
    ]),
    [storeId, limit]
  );
}

async function getPackagingShortageCount(storeId) {
  const rows = await query(
    sql([
      'SELECT COUNT(*) AS total',
      'FROM (',
      packagingShortageQuery(),
      ') shortages',
      'WHERE shortages.store_id = ?'
    ]),
    [storeId]
  );
  return Number(rows[0]?.total || 0);
}

async function getPendingPosWork(storeId, filters = {}, limit = 8) {
  const conditions = ['po.store_id = ?', "po.status = 'pending'"];
  const params = [storeId];
  addDateRange(filters, 'po.order_date', conditions, params);
  return query(
    sql([
      'SELECT po.salesman_id, s.full_name AS salesman_name, COUNT(*) AS pending_order_count,',
      '  COUNT(DISTINCT po.customer_id) AS pending_customer_count,',
      '  COALESCE(SUM(line_summary.sale_total), 0) AS pending_sale_total,',
      '  COALESCE(SUM(line_summary.gift_quantity), 0) AS requested_gift_quantity,',
      '  COALESCE(SUM(line_summary.gift_line_count), 0) AS requested_gift_line_count',
      'FROM pos_orders po',
      'JOIN salesmen s ON s.id = po.salesman_id',
      'LEFT JOIN (',
      '  SELECT pos_order_id,',
      "    SUM(CASE WHEN line_type = 'sale' THEN quantity * unit_price * (1 + vat_rate / 100) ELSE 0 END) AS sale_total,",
      "    SUM(CASE WHEN line_type = 'free_gift' THEN quantity ELSE 0 END) AS gift_quantity,",
      "    SUM(line_type = 'free_gift') AS gift_line_count",
      '  FROM pos_order_lines',
      '  GROUP BY pos_order_id',
      ') line_summary ON line_summary.pos_order_id = po.id',
      'WHERE ' + conditions.join(' AND '),
      'GROUP BY po.salesman_id, s.full_name',
      'ORDER BY pending_order_count DESC, s.full_name ASC',
      'LIMIT ?'
    ]),
    [...params, limit]
  );
}

async function getSalesChart(storeId, filters = {}) {
  const dispatchScope = physicalDispatchConditions(storeId, filters, 'dr');
  return query(
    sql([
      'SELECT DATE(COALESCE(dr.dispatched_at, dr.request_date)) AS chart_date,',
      "  COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END), 0) AS sales_revenue,",
      "  COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0) AS sales_cogs,",
      "  COALESCE(SUM(CASE WHEN di.line_type = 'free_gift' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0) AS gift_cogs,",
      "  COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END), 0)",
      "    - COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0)",
      "    - COALESCE(SUM(CASE WHEN di.line_type = 'free_gift' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0) AS gross_profit_after_gifts",
      'FROM dispatch_requests dr',
      'JOIN dispatch_items di ON di.dispatch_request_id = dr.id',
      'LEFT JOIN (',
      "  SELECT dispatch_item_id, SUM(CASE WHEN status = 'dispatched' THEN total_cost ELSE 0 END) AS dispatched_cost",
      '  FROM dispatch_line_allocations',
      '  GROUP BY dispatch_item_id',
      ') allocation_summary ON allocation_summary.dispatch_item_id = di.id',
      'WHERE ' + dispatchScope.conditions.join(' AND '),
      'GROUP BY DATE(COALESCE(dr.dispatched_at, dr.request_date))',
      'ORDER BY chart_date ASC'
    ]),
    dispatchScope.params
  );
}

async function getNotifications(storeId, userId, limit = 5) {
  return query(
    sql([
      'SELECT id, title, message, notification_type, reference_type, reference_id, read_at, created_at',
      'FROM notifications',
      'WHERE store_id = ? AND user_id = ?',
      'ORDER BY created_at DESC, id DESC',
      'LIMIT ?'
    ]),
    [storeId, userId, limit]
  );
}

module.exports = {
  getActivity,
  getBenchmarks,
  getFinancialSummary,
  getNotifications,
  getPackagingShortageCount,
  getPackagingShortages,
  getPendingPosWork,
  getSalesChart,
  getSummary,
  _private: {
    packagingShortageQuery,
    physicalDispatchConditions
  }
};
