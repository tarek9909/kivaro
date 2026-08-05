const { query } = require('../../bootstrap/db');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { scopedQuery } = require('../../utils/storeScope');

const PHYSICAL_DISPATCH_STATUSES = ['delivery', 'partially_settled', 'completed'];

function sql(parts) {
  return parts.filter(Boolean).join('\n');
}

function addEquals(input, key, column, conditions, params) {
  const value = input[key];
  if (value === undefined || value === null || value === '') return;
  conditions.push(column + ' = ?');
  params.push(value);
}

function addDateRange(input, column, conditions, params) {
  if (input.date_from) {
    conditions.push('DATE(' + column + ') >= ?');
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push('DATE(' + column + ') <= ?');
    params.push(input.date_to);
  }
}

function addSearch(input, fields, conditions, params) {
  if (!input.search || !fields.length) return;
  conditions.push('(' + fields.map((field) => field + ' LIKE ?').join(' OR ') + ')');
  const term = '%' + input.search + '%';
  params.push(...fields.map(() => term));
}

async function pagedRows(config, input = {}) {
  const pagination = getPagination(input);
  const where = config.conditions?.length
    ? 'WHERE ' + config.conditions.join(' AND ')
    : '';
  const baseSql = sql([
    'SELECT ' + config.select,
    'FROM ' + config.from,
    config.joins,
    where,
    config.groupBy
  ]);
  const countSql = config.groupBy
    ? 'SELECT COUNT(*) AS total FROM (' + baseSql + ') report_count'
    : sql([
      'SELECT COUNT(*) AS total',
      'FROM ' + config.from,
      config.joins,
      where
    ]);
  const countRows = await query(countSql, config.params || []);
  const rows = await query(
    sql([
      baseSql,
      config.orderBy || 'ORDER BY id DESC',
      input.allRows ? '' : 'LIMIT ? OFFSET ?'
    ]),
    input.allRows
      ? (config.params || [])
      : [...(config.params || []), pagination.limit, pagination.offset]
  );

  const summaryMetrics = Array.isArray(input.__summary_metrics)
    ? input.__summary_metrics.filter((metric) => /^[a-z_]+$/i.test(metric))
    : [];
  let summary = null;
  if (summaryMetrics.length) {
    const aggregateRows = await query(
      `SELECT COUNT(*) AS \`rows\`, ${summaryMetrics
        .map((metric) => `COALESCE(SUM(\`${metric}\`), 0) AS \`${metric}\``)
        .join(', ')} FROM (${baseSql}) report_summary`,
      config.params || []
    ) || [];
    const aggregate = aggregateRows[0] || {};
    summary = {
      rows: Number(aggregate.rows || 0),
      totals: Object.fromEntries(summaryMetrics.map((metric) => [metric, Number(aggregate[metric] || 0)])),
      metrics: summaryMetrics
    };
  }

  return {
    rows,
    meta: getPaginationMeta({
      ...pagination,
      total: Number(countRows[0]?.total || 0)
    }),
    summary
  };
}

function scoped(input, actor) {
  return scopedQuery(input, actor);
}

function stockFilters(input, conditions, params, forcedItemKind = null) {
  addEquals(input, 'store_id', 'cs.store_id', conditions, params);
  addEquals(input, 'warehouse_id', 'cs.warehouse_id', conditions, params);
  addEquals(input, 'item_id', 'cs.item_id', conditions, params);
  addEquals(input, 'item_kind', 'cs.item_kind', conditions, params);
  addEquals(input, 'stock_mode', 'cs.stock_mode', conditions, params);
  addEquals(input, 'stock_health', 'cs.stock_health', conditions, params);
  addEquals(input, 'status', 'i.status', conditions, params);
  if (forcedItemKind) {
    conditions.push('cs.item_kind = ?');
    params.push(forcedItemKind);
  }
  addSearch(input, ['cs.warehouse_name', 'cs.item_name', 'i.code'], conditions, params);
}

async function stock(input = {}, actor = {}, forcedItemKind = null) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  stockFilters(reportInput, conditions, params, forcedItemKind);
  return pagedRows({
    select: sql([
      'cs.*, i.code AS item_code, i.reorder_level, i.kg_per_carton,',
      // Keep the public column stable without depending on loose-carton data.
      'NULL AS loose_units_per_carton, i.max_content_weight_kg, i.status AS item_status,',
      "CASE WHEN cs.stock_mode = 'carton' THEN cs.quantity_on_hand ELSE NULL END AS sealed_carton_equivalent"
    ]),
    from: 'v_current_stock cs',
    joins: 'JOIN items i ON i.id = cs.item_id',
    conditions,
    params,
    orderBy: 'ORDER BY cs.stock_health DESC, cs.warehouse_name ASC, cs.item_name ASC'
  }, reportInput);
}

const currentStock = (input, actor) => stock(input, actor);
const normalStock = (input, actor) => stock(input, actor, 'normal');
const packagingStock = (input, actor) => stock(input, actor, 'packaging');

async function readyStock(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'rs.store_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'rs.warehouse_id', conditions, params);
  addEquals(reportInput, 'packaging_group_id', 'rs.packaging_group_id', conditions, params);
  addEquals(reportInput, 'ready_status', 'rs.status', conditions, params);
  addEquals(reportInput, 'item_id', 'rs.inner_item_id', conditions, params);
  addSearch(reportInput, [
    'w.name',
    'rs.packaging_group_name',
    'rs.outer_name_snapshot',
    'rs.inner_name_snapshot'
  ], conditions, params);
  return pagedRows({
    select: sql([
      'rs.*, w.name AS warehouse_name, outer_item.code AS outer_item_code, inner_item.code AS inner_item_code,',
      'CASE WHEN rs.status = \'full\' THEN 1 ELSE 0 END AS whole_outer_available,',
      'CASE WHEN rs.available_inner_quantity > 0 THEN 1 ELSE 0 END AS inner_available'
    ]),
    from: 'v_ready_stock rs',
    joins: sql([
      'JOIN warehouses w ON w.id = rs.warehouse_id',
      'JOIN items outer_item ON outer_item.id = rs.outer_item_id',
      'JOIN items inner_item ON inner_item.id = rs.inner_item_id'
    ]),
    conditions,
    params,
    orderBy: "ORDER BY FIELD(rs.status, 'full', 'partial', 'depleted', 'cancelled'), rs.created_at ASC, rs.ready_stock_container_id ASC"
  }, reportInput);
}

async function stockMovements(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'sm.store_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'sm.warehouse_id', conditions, params);
  addEquals(reportInput, 'item_id', 'sm.item_id', conditions, params);
  addEquals(reportInput, 'packaging_group_id', 'sm.packaging_group_id', conditions, params);
  addEquals(reportInput, 'movement_type', 'sm.movement_type', conditions, params);
  addEquals(reportInput, 'reference_type', 'sm.reference_type', conditions, params);
  addEquals(reportInput, 'source', 'sm.source', conditions, params);
  addDateRange(reportInput, 'sm.created_at', conditions, params);
  addSearch(reportInput, ['sm.warehouse_name', 'sm.item_name', 'sm.item_code', 'sm.reference_type'], conditions, params);
  return pagedRows({
    select: 'sm.*',
    from: sql([
      '(',
      '  SELECT ism.id, ism.store_id, ism.warehouse_id, w.name AS warehouse_name,',
      "    'item' AS source, ism.item_id, NULL AS ready_stock_container_id, NULL AS packaging_group_id,",
      '    i.name AS item_name, i.code AS item_code, i.item_kind, i.stock_mode, u.symbol AS unit_label,',
      '    ism.movement_type, ism.quantity_change, ism.quantity_before, ism.quantity_after,',
      '    ism.reserved_quantity_change, ism.reserved_quantity_before, ism.reserved_quantity_after,',
      '    ism.unit_cost, ism.total_cost, ism.reference_type, ism.reference_id,',
      // Open-carton shelves are introduced by a later inventory model. The
      // current baseline has no such column, so legacy movements report null.
      '    ism.carton_stock_lot_id, NULL AS open_carton_shelf_id, ism.notes, ism.created_by, ism.created_at',
      '  FROM item_stock_movements ism',
      '  JOIN warehouses w ON w.id = ism.warehouse_id',
      '  JOIN items i ON i.id = ism.item_id',
      '  JOIN units u ON u.id = i.base_unit_id',
      '  UNION ALL',
      '  SELECT rsm.id, rsm.store_id, rsm.warehouse_id, w.name AS warehouse_name,',
      "    'ready_stock' AS source, rsc.inner_item_id AS item_id, rsm.ready_stock_container_id,",
      '    rsc.packaging_group_id, rsc.inner_name_snapshot AS item_name, inner_item.code AS item_code,',
      "    'ready_stock' AS item_kind, 'piece' AS stock_mode, 'inner unit' AS unit_label,",
      '    rsm.movement_type, rsm.inner_quantity_change AS quantity_change,',
      '    rsm.inner_quantity_before AS quantity_before, rsm.inner_quantity_after AS quantity_after,',
      '    0 AS reserved_quantity_change, 0 AS reserved_quantity_before, 0 AS reserved_quantity_after,',
      '    CASE WHEN rsm.inner_quantity_change <> 0',
      '      THEN ABS(rsm.cost_change / rsm.inner_quantity_change) ELSE NULL END AS unit_cost,',
      '    rsm.cost_change AS total_cost, rsm.reference_type, rsm.reference_id,',
      '    NULL AS carton_stock_lot_id, NULL AS open_carton_shelf_id, rsm.notes, rsm.created_by, rsm.created_at',
      '  FROM ready_stock_movements rsm',
      '  JOIN ready_stock_containers rsc ON rsc.id = rsm.ready_stock_container_id',
      '  JOIN warehouses w ON w.id = rsm.warehouse_id',
      '  JOIN items inner_item ON inner_item.id = rsc.inner_item_id',
      ') sm'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY sm.created_at DESC, sm.source ASC, sm.id DESC'
  }, reportInput);
}

async function packagingOperations(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'po.store_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'po.warehouse_id', conditions, params);
  addEquals(reportInput, 'packaging_group_id', 'po.packaging_group_id', conditions, params);
  addEquals(reportInput, 'status', 'po.status', conditions, params);
  addDateRange(reportInput, 'po.completed_at', conditions, params);
  addSearch(reportInput, ['po.operation_number', 'pg.name', 'input_item.name', 'w.name'], conditions, params);
  return pagedRows({
    select: sql([
      'po.*, pg.name AS packaging_group_name, input_item.name AS input_item_name,',
      'w.name AS warehouse_name, COALESCE(container_summary.container_count, 0) AS container_count,',
      'COALESCE(container_summary.full_container_count, 0) AS full_container_count,',
      'COALESCE(container_summary.partial_container_count, 0) AS partial_container_count,',
      'COALESCE(container_summary.depleted_container_count, 0) AS depleted_container_count,',
      'COALESCE(component_summary.component_cost, 0) AS snapshotted_component_cost'
    ]),
    from: 'packaging_operations po',
    joins: sql([
      'JOIN packaging_groups pg ON pg.id = po.packaging_group_id',
      'JOIN items input_item ON input_item.id = po.input_item_id',
      'JOIN warehouses w ON w.id = po.warehouse_id',
      'LEFT JOIN (',
      '  SELECT packaging_operation_id, COUNT(*) AS container_count,',
      "    SUM(status = 'full') AS full_container_count,",
      "    SUM(status = 'partial') AS partial_container_count,",
      "    SUM(status = 'depleted') AS depleted_container_count",
      '  FROM ready_stock_containers',
      '  GROUP BY packaging_operation_id',
      ') container_summary ON container_summary.packaging_operation_id = po.id',
      'LEFT JOIN (',
      '  SELECT packaging_operation_id, SUM(total_cost) AS component_cost',
      '  FROM packaging_operation_components',
      '  GROUP BY packaging_operation_id',
      ') component_summary ON component_summary.packaging_operation_id = po.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY po.completed_at DESC, po.id DESC'
  }, reportInput);
}

function packagingShortageSource() {
  return sql([
    '(',
    '  SELECT req.store_id, req.packaging_group_id, req.packaging_group_name, req.warehouse_id,',
    '    req.component_role, req.item_id, req.required_quantity,',
    '    i.name AS item_name, i.code AS item_code, i.item_kind, i.stock_mode, i.reorder_level,',
    '    COALESCE(sb.quantity_on_hand, 0) AS quantity_on_hand,',
    '    COALESCE(sb.quantity_reserved, 0) AS quantity_reserved,',
    '    COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) AS available_quantity,',
    '    GREATEST(req.required_quantity - COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0), 0) AS shortage_quantity',
    '  FROM (',
    '    SELECT pg.store_id, pg.id AS packaging_group_id, pg.name AS packaging_group_name,',
    '      pg.default_warehouse_id AS warehouse_id, \'raw_input\' AS component_role,',
    '      pg.input_item_id AS item_id,',
    '      (inner_component.quantity_per_outer * inner_item.max_content_weight_kg) AS required_quantity',
    '    FROM packaging_groups pg',
    '    JOIN packaging_group_components inner_component',
    "      ON inner_component.packaging_group_id = pg.id AND inner_component.component_role = 'inner_sellable'",
    '    JOIN items inner_item ON inner_item.id = inner_component.item_id',
    "    WHERE pg.status = 'active'",
    '    UNION ALL',
    '    SELECT pg.store_id, pg.id AS packaging_group_id, pg.name AS packaging_group_name,',
    '      pg.default_warehouse_id AS warehouse_id, pgc.component_role, pgc.item_id,',
    '      pgc.quantity_per_outer AS required_quantity',
    '    FROM packaging_groups pg',
    '    JOIN packaging_group_components pgc ON pgc.packaging_group_id = pg.id',
    "    WHERE pg.status = 'active'",
    '  ) req',
    '  JOIN items i ON i.id = req.item_id',
    '  LEFT JOIN item_stock_balances sb ON sb.warehouse_id = req.warehouse_id AND sb.item_id = req.item_id',
    '  WHERE req.warehouse_id IS NOT NULL',
    '    AND COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) < req.required_quantity',
    ') ps'
  ]);
}

async function packagingShortages(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'ps.store_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'ps.warehouse_id', conditions, params);
  addEquals(reportInput, 'packaging_group_id', 'ps.packaging_group_id', conditions, params);
  addEquals(reportInput, 'item_id', 'ps.item_id', conditions, params);
  addEquals(reportInput, 'component_role', 'ps.component_role', conditions, params);
  addSearch(reportInput, ['ps.packaging_group_name', 'ps.item_name', 'ps.item_code'], conditions, params);
  return pagedRows({
    select: 'ps.*',
    from: packagingShortageSource(),
    conditions,
    params,
    orderBy: 'ORDER BY ps.shortage_quantity DESC, ps.packaging_group_name ASC, ps.item_name ASC'
  }, reportInput);
}

function physicalDispatchFilters(input, conditions, params, alias = 'dr', dateColumn = null) {
  conditions.push(alias + ".status IN ('delivery', 'partially_settled', 'completed')");
  addEquals(input, 'status', alias + '.status', conditions, params);
  addEquals(input, 'store_id', alias + '.store_id', conditions, params);
  addEquals(input, 'salesman_id', alias + '.salesman_id', conditions, params);
  addEquals(input, 'warehouse_id', alias + '.warehouse_id', conditions, params);
  addDateRange(input, dateColumn || 'COALESCE(' + alias + '.dispatched_at, ' + alias + '.request_date)', conditions, params);
}

function fulfilledLineSelect() {
  return sql([
    'dr.id AS dispatch_request_id, dr.dispatch_number, dr.request_date, dr.status AS dispatch_status,',
    'dr.revision, DATE(COALESCE(dr.dispatched_at, dr.request_date)) AS dispatched_date,',
    's.id AS salesman_id, s.full_name AS salesman_name, w.id AS warehouse_id, w.name AS warehouse_name,',
    'dc.id AS dispatch_customer_id, dc.customer_id, c.name AS customer_name,',
    'l.id AS location_id, l.name AS location_name, sl.id AS sublocation_id, sl.name AS sublocation_name,',
    'inv.id AS invoice_id, inv.invoice_number, inv.status AS invoice_status,',
    'di.id AS dispatch_item_id, di.sale_catalog_entry_id, di.item_id, di.packaging_group_id,',
    'di.line_type, di.fulfillment_type, di.item_name_snapshot AS item_name,',
    'di.unit_label_snapshot AS unit_label, di.quantity, di.returned_quantity,',
    '(di.quantity - di.returned_quantity) AS net_quantity, di.unit_price, di.unit_cost,',
    'di.subtotal_amount, di.vat_rate, di.vat_amount, di.line_total,',
    'CASE WHEN di.quantity > 0 THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END AS net_subtotal_amount,',
    'CASE WHEN di.quantity > 0 THEN di.vat_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END AS net_vat_amount,',
    'CASE WHEN di.quantity > 0 THEN di.line_total * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END AS net_total_amount,',
    'COALESCE(allocation_summary.dispatched_cost, 0) AS dispatched_cogs,',
    'COALESCE(allocation_summary.returned_cost, 0) AS returned_cogs'
  ]);
}

function fulfilledLineJoins() {
  return sql([
    'JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id',
    'JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id',
    'JOIN customers c ON c.id = dc.customer_id',
    'JOIN locations l ON l.id = dc.location_id',
    'JOIN sublocations sl ON sl.id = dc.sublocation_id',
    'JOIN salesmen s ON s.id = dr.salesman_id',
    'JOIN warehouses w ON w.id = dr.warehouse_id',
    'LEFT JOIN invoices inv ON inv.dispatch_customer_id = dc.id AND inv.revision = dr.revision',
    'LEFT JOIN (',
    '  SELECT dispatch_item_id,',
    "    SUM(CASE WHEN status = 'dispatched' THEN total_cost ELSE 0 END) AS dispatched_cost,",
    "    SUM(CASE WHEN status = 'returned' THEN total_cost ELSE 0 END) AS returned_cost",
    '  FROM dispatch_line_allocations',
    '  GROUP BY dispatch_item_id',
    ') allocation_summary ON allocation_summary.dispatch_item_id = di.id'
  ]);
}

async function fulfilledLines(input = {}, actor = {}, lineType = null) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  physicalDispatchFilters(reportInput, conditions, params);
  addEquals(reportInput, 'customer_id', 'dc.customer_id', conditions, params);
  addEquals(reportInput, 'location_id', 'dc.location_id', conditions, params);
  addEquals(reportInput, 'sublocation_id', 'dc.sublocation_id', conditions, params);
  addEquals(reportInput, 'item_id', 'di.item_id', conditions, params);
  addEquals(reportInput, 'packaging_group_id', 'di.packaging_group_id', conditions, params);
  addEquals(reportInput, 'fulfillment_type', 'di.fulfillment_type', conditions, params);
  if (lineType) {
    conditions.push('di.line_type = ?');
    params.push(lineType);
  } else {
    addEquals(reportInput, 'line_type', 'di.line_type', conditions, params);
  }
  addSearch(reportInput, [
    'dr.dispatch_number',
    'c.name',
    's.full_name',
    'di.item_name_snapshot',
    'inv.invoice_number'
  ], conditions, params);
  return pagedRows({
    select: fulfilledLineSelect(),
    from: 'dispatch_items di',
    joins: fulfilledLineJoins(),
    conditions,
    params,
    orderBy: 'ORDER BY dispatched_date DESC, dr.id DESC, di.id DESC'
  }, reportInput);
}

const sales = (input, actor) => fulfilledLines(input, actor, 'sale');
const gifts = (input, actor) => fulfilledLines(input, actor, 'free_gift');

async function invoices(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'inv.store_id', conditions, params);
  addEquals(reportInput, 'dispatch_request_id', 'inv.dispatch_request_id', conditions, params);
  addEquals(reportInput, 'customer_id', 'dc.customer_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'dr.salesman_id', conditions, params);
  addEquals(reportInput, 'invoice_status', 'inv.status', conditions, params);
  addEquals(reportInput, 'status', 'inv.status', conditions, params);
  addDateRange(reportInput, 'inv.invoice_date', conditions, params);
  addSearch(reportInput, ['inv.invoice_number', 'dr.dispatch_number', 'c.name', 's.full_name'], conditions, params);
  return pagedRows({
    select: sql([
      'inv.*, dr.dispatch_number, dr.status AS dispatch_status, dr.request_date,',
      's.id AS salesman_id, s.full_name AS salesman_name, dc.customer_id,',
      'c.name AS customer_name, dc.payment_status, dc.collected_amount, dc.debt_amount,',
      'COALESCE(line_summary.sale_lines, 0) AS sale_lines,',
      'COALESCE(line_summary.gift_lines, 0) AS gift_lines,',
      'COALESCE(line_summary.gift_cogs, 0) AS gift_cogs'
    ]),
    from: 'invoices inv',
    joins: sql([
      'JOIN dispatch_requests dr ON dr.id = inv.dispatch_request_id',
      'JOIN dispatch_customers dc ON dc.id = inv.dispatch_customer_id',
      'JOIN customers c ON c.id = dc.customer_id',
      'JOIN salesmen s ON s.id = dr.salesman_id',
      'LEFT JOIN (',
      '  SELECT invoice_id,',
      "    SUM(il.line_type = 'sale') AS sale_lines,",
      "    SUM(il.line_type = 'free_gift') AS gift_lines,",
      "    SUM(CASE WHEN il.line_type = 'free_gift' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END) AS gift_cogs",
      '  FROM invoice_lines il',
      '  LEFT JOIN (',
      "    SELECT dispatch_item_id, SUM(CASE WHEN status = 'dispatched' THEN total_cost ELSE 0 END) AS dispatched_cost",
      '    FROM dispatch_line_allocations',
      '    GROUP BY dispatch_item_id',
      '  ) allocation_summary ON allocation_summary.dispatch_item_id = il.dispatch_item_id',
      '  GROUP BY invoice_id',
      ') line_summary ON line_summary.invoice_id = inv.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY inv.invoice_date DESC, inv.id DESC'
  }, reportInput);
}

async function customerBalances(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'c.store_id', conditions, params);
  addEquals(reportInput, 'customer_id', 'c.id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'c.assigned_salesman_id', conditions, params);
  addEquals(reportInput, 'location_id', 'c.location_id', conditions, params);
  addEquals(reportInput, 'sublocation_id', 'c.sublocation_id', conditions, params);
  addEquals(reportInput, 'status', 'c.status', conditions, params);
  addSearch(reportInput, ['c.name', 'c.customer_code', 'c.phone', 'l.name', 'sl.name'], conditions, params);
  return pagedRows({
    select: sql([
      'c.id AS customer_id, c.store_id, c.customer_code, c.name AS customer_name, c.phone, c.address,',
      'c.credit_limit, c.status AS customer_status, l.name AS location_name, sl.name AS sublocation_name,',
      's.full_name AS assigned_salesman_name,',
      'COALESCE(debt_summary.total_debt_subtotal, 0) AS total_debt_subtotal,',
      'COALESCE(debt_summary.total_debt_vat, 0) AS total_debt_vat,',
      'COALESCE(debt_summary.total_debt_created, 0) AS total_debt_created,',
      'COALESCE(debt_summary.total_debt_paid, 0) AS total_debt_paid,',
      'COALESCE(debt_summary.total_remaining_debt, 0) AS total_remaining_debt,',
      'COALESCE(credit_summary.available_credit, 0) AS available_credit,',
      '(COALESCE(debt_summary.total_remaining_debt, 0) - COALESCE(credit_summary.available_credit, 0)) AS net_customer_balance,',
      'COALESCE(invoice_summary.invoice_total, 0) AS invoice_total,',
      'COALESCE(receipt_summary.receipt_total, 0) AS receipt_total,',
      'COALESCE(payment_summary.payment_total, 0) AS payment_total'
    ]),
    from: 'customers c',
    joins: sql([
      'JOIN locations l ON l.id = c.location_id',
      'JOIN sublocations sl ON sl.id = c.sublocation_id',
      'LEFT JOIN salesmen s ON s.id = c.assigned_salesman_id',
      'LEFT JOIN (',
      '  SELECT customer_id, SUM(subtotal_amount) AS total_debt_subtotal, SUM(vat_amount) AS total_debt_vat,',
      '    SUM(original_amount) AS total_debt_created, SUM(paid_amount) AS total_debt_paid,',
      "    SUM(CASE WHEN status IN ('pending', 'partially_paid') THEN remaining_amount ELSE 0 END) AS total_remaining_debt",
      '  FROM customer_debts',
      "  WHERE status <> 'cancelled'",
      '  GROUP BY customer_id',
      ') debt_summary ON debt_summary.customer_id = c.id',
      'LEFT JOIN (',
      '  SELECT customer_id, SUM(remaining_amount) AS available_credit',
      '  FROM customer_credits',
      "  WHERE status IN ('available', 'partially_used')",
      '  GROUP BY customer_id',
      ') credit_summary ON credit_summary.customer_id = c.id',
      'LEFT JOIN (',
      "  SELECT dc.customer_id, SUM(inv.total_amount) AS invoice_total FROM invoices inv",
      '  JOIN dispatch_customers dc ON dc.id = inv.dispatch_customer_id',
      "  WHERE inv.status = 'issued' GROUP BY dc.customer_id",
      ') invoice_summary ON invoice_summary.customer_id = c.id',
      'LEFT JOIN (',
      '  SELECT customer_id, SUM(total_amount) AS receipt_total',
      '  FROM customer_receipts',
      '  GROUP BY customer_id',
      ') receipt_summary ON receipt_summary.customer_id = c.id',
      'LEFT JOIN (',
      '  SELECT customer_id, SUM(amount) AS payment_total',
      '  FROM customer_payments',
      '  GROUP BY customer_id',
      ') payment_summary ON payment_summary.customer_id = c.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY c.name ASC, c.id ASC'
  }, reportInput);
}

async function debts(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'cd.store_id', conditions, params);
  addEquals(reportInput, 'customer_id', 'cd.customer_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'dr.salesman_id', conditions, params);
  addEquals(reportInput, 'status', 'cd.status', conditions, params);
  addDateRange(reportInput, 'cd.debt_date', conditions, params);
  addSearch(reportInput, ['cd.debt_number', 'c.name', 's.full_name', 'dr.dispatch_number'], conditions, params);
  return pagedRows({
    select: sql([
      'cd.*, c.name AS customer_name, dr.dispatch_number, dr.salesman_id,',
      's.full_name AS salesman_name, COALESCE(adjustments.adjustment_amount, 0) AS debt_adjustment_amount,',
      "CASE WHEN cd.status IN ('pending', 'partially_paid') THEN cd.remaining_amount ELSE 0 END AS outstanding_debt_amount"
    ]),
    from: 'customer_debts cd',
    joins: sql([
      'JOIN customers c ON c.id = cd.customer_id',
      'LEFT JOIN dispatch_requests dr ON dr.id = cd.dispatch_request_id',
      'LEFT JOIN salesmen s ON s.id = dr.salesman_id',
      'LEFT JOIN (',
      '  SELECT customer_debt_id, SUM(amount) AS adjustment_amount',
      '  FROM customer_debt_adjustments',
      '  GROUP BY customer_debt_id',
      ') adjustments ON adjustments.customer_debt_id = cd.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY cd.debt_date DESC, cd.id DESC'
  }, reportInput);
}

async function purchases(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'po.store_id', conditions, params);
  addEquals(reportInput, 'supplier_id', 'po.supplier_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'po.warehouse_id', conditions, params);
  addEquals(reportInput, 'status', 'po.status', conditions, params);
  addDateRange(reportInput, 'po.order_date', conditions, params);
  addSearch(reportInput, ['po.po_number', 's.name', 'w.name'], conditions, params);
  return pagedRows({
    select: sql([
      'po.*, s.name AS supplier_name, w.name AS warehouse_name,',
      'COALESCE(item_summary.item_count, 0) AS item_count,',
      'COALESCE(item_summary.ordered_quantity, 0) AS ordered_quantity,',
      'COALESCE(item_summary.received_quantity, 0) AS received_quantity'
    ]),
    from: 'purchase_orders po',
    joins: sql([
      'LEFT JOIN suppliers s ON s.id = po.supplier_id',
      'JOIN warehouses w ON w.id = po.warehouse_id',
      'LEFT JOIN (',
      '  SELECT purchase_order_id, COUNT(*) AS item_count, SUM(ordered_quantity) AS ordered_quantity,',
      '    SUM(received_quantity) AS received_quantity',
      '  FROM purchase_order_items',
      '  GROUP BY purchase_order_id',
      ') item_summary ON item_summary.purchase_order_id = po.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY po.order_date DESC, po.id DESC'
  }, reportInput);
}

async function dispatchSummary(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'ds.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'dr.salesman_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'dr.warehouse_id', conditions, params);
  addEquals(reportInput, 'status', 'ds.status', conditions, params);
  addDateRange(reportInput, 'ds.request_date', conditions, params);
  addSearch(reportInput, ['ds.dispatch_number', 'ds.salesman_name', 'ds.warehouse_name'], conditions, params);
  return pagedRows({
    select: sql([
      'ds.dispatch_request_id, ds.store_id, ds.dispatch_number, ds.request_date, ds.status, ds.revision,',
      'dr.salesman_id, ds.salesman_name, ds.warehouse_name, ds.customers_count, ds.total_quantity,',
      'ds.subtotal_amount, ds.vat_amount, ds.total_amount, ds.total_collected, ds.total_debt,',
      'COALESCE(allocation_summary.dispatched_cogs, 0) AS dispatched_cogs,',
      'COALESCE(allocation_summary.gift_cogs, 0) AS gift_cogs,',
      'COALESCE(allocation_summary.gift_cogs, 0) AS dispatched_gift_cogs'
    ]),
    from: 'v_dispatch_summary ds',
    joins: sql([
      'JOIN dispatch_requests dr ON dr.id = ds.dispatch_request_id',
      'LEFT JOIN (',
      '  SELECT di.dispatch_request_id,',
      "    SUM(CASE WHEN dla.status = 'dispatched' THEN dla.total_cost ELSE 0 END) AS dispatched_cogs,",
      "    SUM(CASE WHEN dla.status = 'dispatched' AND di.line_type = 'free_gift' THEN dla.total_cost ELSE 0 END) AS gift_cogs",
      '  FROM dispatch_items di',
      '  LEFT JOIN dispatch_line_allocations dla ON dla.dispatch_item_id = di.id',
      '  GROUP BY di.dispatch_request_id',
      ') allocation_summary ON allocation_summary.dispatch_request_id = ds.dispatch_request_id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY ds.request_date DESC, ds.dispatch_request_id DESC'
  }, reportInput);
}

async function salesmanTargetProgress(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'stp.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'stp.salesman_id', conditions, params);
  addEquals(reportInput, 'location_id', 'stp.location_id', conditions, params);
  addEquals(reportInput, 'sublocation_id', 'stp.sublocation_id', conditions, params);
  addDateRange(reportInput, 'stp.period_start', conditions, params);
  addSearch(reportInput, ['stp.salesman_name', 'stp.location_name', 'stp.sublocation_name'], conditions, params);
  return pagedRows({
    select: 'stp.*',
    from: 'v_salesman_target_progress stp',
    conditions,
    params,
    orderBy: 'ORDER BY stp.period_start DESC, stp.salesman_name ASC'
  }, reportInput);
}

function physicalConditionsForDerived(input, alias, params) {
  const conditions = [
    alias + '.store_id = ?',
    alias + ".status IN ('delivery', 'partially_settled', 'completed')"
  ];
  params.push(input.store_id);
  if (input.date_from) {
    conditions.push('DATE(COALESCE(' + alias + '.dispatched_at, ' + alias + '.request_date)) >= ?');
    params.push(input.date_from);
  }
  if (input.date_to) {
    conditions.push('DATE(COALESCE(' + alias + '.dispatched_at, ' + alias + '.request_date)) <= ?');
    params.push(input.date_to);
  }
  return conditions;
}

async function salesmanPerformance(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const dispatchParams = [];
  const customerParams = [];
  const lineParams = [];
  const dispatchWhere = physicalConditionsForDerived(reportInput, 'dr', dispatchParams).join(' AND ');
  const customerWhere = physicalConditionsForDerived(reportInput, 'dr', customerParams).join(' AND ');
  const lineWhere = physicalConditionsForDerived(reportInput, 'dr', lineParams).join(' AND ');
  const conditions = ['s.store_id = ?'];
  const params = [
    ...dispatchParams,
    ...customerParams,
    ...lineParams,
    reportInput.store_id
  ];
  addEquals(reportInput, 'salesman_id', 's.id', conditions, params);
  addSearch(reportInput, ['s.full_name', 's.phone'], conditions, params);
  return pagedRows({
    select: sql([
      's.id AS salesman_id, s.store_id, s.full_name AS salesman_name, s.phone, s.base_salary, s.status AS salesman_status,',
      'COALESCE(dispatch_summary.dispatch_count, 0) AS dispatch_count,',
      'COALESCE(customer_summary.delivered_customer_count, 0) AS delivered_customer_count,',
      'COALESCE(dispatch_summary.total_collected, 0) AS total_collected,',
      'COALESCE(dispatch_summary.total_debt, 0) AS total_debt,',
      'COALESCE(line_summary.sales_revenue, 0) AS sales_revenue,',
      'COALESCE(line_summary.sales_vat, 0) AS sales_vat,',
      'COALESCE(line_summary.sales_cogs, 0) AS sales_cogs,',
      'COALESCE(line_summary.gift_quantity, 0) AS gift_quantity,',
      'COALESCE(line_summary.gift_cogs, 0) AS gift_cogs,',
      '(COALESCE(line_summary.sales_revenue, 0) - COALESCE(line_summary.sales_cogs, 0) - COALESCE(line_summary.gift_cogs, 0)) AS gross_profit_after_gifts'
    ]),
    from: 'salesmen s',
    joins: sql([
      'LEFT JOIN (',
      '  SELECT dr.salesman_id, COUNT(*) AS dispatch_count, SUM(dr.total_collected) AS total_collected, SUM(dr.total_debt) AS total_debt',
      '  FROM dispatch_requests dr',
      '  WHERE ' + dispatchWhere,
      '  GROUP BY dr.salesman_id',
      ') dispatch_summary ON dispatch_summary.salesman_id = s.id',
      'LEFT JOIN (',
      '  SELECT dr.salesman_id, COUNT(DISTINCT dc.customer_id) AS delivered_customer_count',
      '  FROM dispatch_requests dr',
      '  JOIN dispatch_customers dc ON dc.dispatch_request_id = dr.id',
      '  WHERE ' + customerWhere,
      '  GROUP BY dr.salesman_id',
      ') customer_summary ON customer_summary.salesman_id = s.id',
      'LEFT JOIN (',
      '  SELECT dr.salesman_id,',
      "    SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END) AS sales_revenue,",
      "    SUM(CASE WHEN di.line_type = 'sale' THEN di.vat_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END) AS sales_vat,",
      "    SUM(CASE WHEN di.line_type = 'sale' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END) AS sales_cogs,",
      "    SUM(CASE WHEN di.line_type = 'free_gift' THEN di.quantity - di.returned_quantity ELSE 0 END) AS gift_quantity,",
      "    SUM(CASE WHEN di.line_type = 'free_gift' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END) AS gift_cogs",
      '  FROM dispatch_requests dr',
      '  JOIN dispatch_items di ON di.dispatch_request_id = dr.id',
      '  LEFT JOIN (',
      "    SELECT dispatch_item_id, SUM(CASE WHEN status = 'dispatched' THEN total_cost ELSE 0 END) AS dispatched_cost",
      '    FROM dispatch_line_allocations GROUP BY dispatch_item_id',
      '  ) allocation_summary ON allocation_summary.dispatch_item_id = di.id',
      '  WHERE ' + lineWhere,
      '  GROUP BY dr.salesman_id',
      ') line_summary ON line_summary.salesman_id = s.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY sales_revenue DESC, s.full_name ASC'
  }, reportInput);
}

async function commissions(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'cc.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'cc.salesman_id', conditions, params);
  addEquals(reportInput, 'sublocation_id', 'cc.sublocation_id', conditions, params);
  addEquals(reportInput, 'status', 'cc.status', conditions, params);
  addDateRange(reportInput, 'cc.period_start', conditions, params);
  addSearch(reportInput, ['s.full_name', 'sl.name', 'cr.name'], conditions, params);
  return pagedRows({
    select: sql([
      'cc.*, s.full_name AS salesman_name, s.base_salary, sl.name AS sublocation_name, cr.name AS commission_rule_name,',
      'cc.total_commission AS total_payable,',
      'COALESCE(payment_summary.paid_amount, 0) AS paid_amount'
    ]),
    from: 'commission_calculations cc',
    joins: sql([
      'JOIN salesmen s ON s.id = cc.salesman_id',
      'JOIN sublocations sl ON sl.id = cc.sublocation_id',
      'JOIN commission_rules cr ON cr.id = cc.commission_rule_id',
      'LEFT JOIN (',
      '  SELECT commission_calculation_id, SUM(amount) AS paid_amount',
      '  FROM commission_payments',
      '  GROUP BY commission_calculation_id',
      ') payment_summary ON payment_summary.commission_calculation_id = cc.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY cc.period_start DESC, cc.id DESC'
  }, reportInput);
}

async function profitLoss(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const salesParams = [];
  const salesWhere = physicalConditionsForDerived(reportInput, 'dr', salesParams).join(' AND ');
  const expenseConditions = ['e.store_id = ?'];
  const expenseParams = [reportInput.store_id];
  const commissionConditions = ['cp.store_id = ?'];
  const commissionParams = [reportInput.store_id];
  const payrollConditions = ['spp.store_id = ?'];
  const payrollParams = [reportInput.store_id];
  const supplierConditions = ['sp.store_id = ?'];
  const supplierParams = [reportInput.store_id];
  const writeoffConditions = ["cda.store_id = ?", "cda.adjustment_type = 'write_off'"];
  const writeoffParams = [reportInput.store_id];
  addDateRange(reportInput, 'e.expense_date', expenseConditions, expenseParams);
  addDateRange(reportInput, 'cp.payment_date', commissionConditions, commissionParams);
  addDateRange(reportInput, 'spp.payment_date', payrollConditions, payrollParams);
  addDateRange(reportInput, 'sp.payment_date', supplierConditions, supplierParams);
  addDateRange(reportInput, 'cda.adjustment_date', writeoffConditions, writeoffParams);
  const rows = await query(
    sql([
      'SELECT sales.sales_revenue, sales.sales_vat, sales.sales_cogs, sales.gift_cogs,',
      '(sales.sales_revenue - sales.sales_cogs) AS gross_profit_before_gifts,',
      '(sales.sales_revenue - sales.sales_cogs - sales.gift_cogs) AS gross_profit_after_gifts,',
      'expenses.operating_expenses, commissions.commission_expenses, payroll.payroll_expenses, writeoffs.debt_write_offs,',
      'supplier_cash.supplier_payments_cash_outflow,',
      '(sales.sales_cogs + sales.gift_cogs + expenses.operating_expenses + commissions.commission_expenses + payroll.payroll_expenses + writeoffs.debt_write_offs) AS total_expense,',
      'sales.sales_revenue AS total_income,',
      '(sales.sales_revenue - sales.sales_cogs - sales.gift_cogs - expenses.operating_expenses - commissions.commission_expenses - payroll.payroll_expenses - writeoffs.debt_write_offs) AS net_profit',
      'FROM (',
      '  SELECT',
      "    COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END), 0) AS sales_revenue,",
      "    COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN di.vat_amount * (di.quantity - di.returned_quantity) / di.quantity ELSE 0 END), 0) AS sales_vat,",
      "    COALESCE(SUM(CASE WHEN di.line_type = 'sale' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0) AS sales_cogs,",
      "    COALESCE(SUM(CASE WHEN di.line_type = 'free_gift' THEN COALESCE(allocation_summary.dispatched_cost, 0) ELSE 0 END), 0) AS gift_cogs",
      '  FROM dispatch_requests dr',
      '  JOIN dispatch_items di ON di.dispatch_request_id = dr.id',
      '  LEFT JOIN (',
      "    SELECT dispatch_item_id, SUM(CASE WHEN status = 'dispatched' THEN total_cost ELSE 0 END) AS dispatched_cost",
      '    FROM dispatch_line_allocations',
      '    GROUP BY dispatch_item_id',
      '  ) allocation_summary ON allocation_summary.dispatch_item_id = di.id',
      '  WHERE ' + salesWhere,
      ') sales',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(e.amount), 0) AS operating_expenses',
      '  FROM expenses e',
      '  WHERE ' + expenseConditions.join(' AND '),
      ') expenses',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(cp.amount), 0) AS commission_expenses',
      '  FROM commission_payments cp',
      '  WHERE ' + commissionConditions.join(' AND ') + ' AND cp.payroll_payment_id IS NULL',
      ') commissions',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(spp.total_amount), 0) AS payroll_expenses',
      '  FROM salesman_payroll_payments spp',
      '  WHERE ' + payrollConditions.join(' AND '),
      ') payroll',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(sp.amount), 0) AS supplier_payments_cash_outflow',
      '  FROM supplier_payments sp',
      '  WHERE ' + supplierConditions.join(' AND '),
      ') supplier_cash',
      'CROSS JOIN (',
      '  SELECT COALESCE(SUM(cda.amount), 0) AS debt_write_offs',
      '  FROM customer_debt_adjustments cda',
      '  WHERE ' + writeoffConditions.join(' AND '),
      ') writeoffs'
    ]),
    [
      ...salesParams,
      ...expenseParams,
      ...commissionParams,
      ...payrollParams,
      ...supplierParams,
      ...writeoffParams
    ]
  );
  return {
    rows,
    meta: {
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1
    }
  };
}

async function deliveryCloseouts(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'ds.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'dr.salesman_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'dr.warehouse_id', conditions, params);
  addEquals(reportInput, 'status', 'ds.status', conditions, params);
  addDateRange(reportInput, 'ds.settlement_date', conditions, params);
  addSearch(reportInput, ['ds.settlement_number', 'dr.dispatch_number', 's.full_name', 'ca.account_name'], conditions, params);
  return pagedRows({
    select: sql([
      'ds.*, dr.dispatch_number, dr.salesman_id, s.full_name AS salesman_name, w.name AS warehouse_name,',
      'ca.account_name AS cash_account_name, COALESCE(customer_summary.customer_count, 0) AS customer_count,',
      'COALESCE(customer_summary.collected_amount, 0) AS customer_collected_amount,',
      'COALESCE(customer_summary.debt_amount, 0) AS customer_debt_amount'
    ]),
    from: 'dispatch_settlements ds',
    joins: sql([
      'JOIN dispatch_requests dr ON dr.id = ds.dispatch_request_id',
      'JOIN salesmen s ON s.id = dr.salesman_id',
      'JOIN warehouses w ON w.id = dr.warehouse_id',
      'LEFT JOIN cash_accounts ca ON ca.id = ds.cash_account_id',
      'LEFT JOIN (',
      '  SELECT dispatch_settlement_id, COUNT(*) AS customer_count, SUM(collected_amount) AS collected_amount, SUM(debt_amount) AS debt_amount',
      '  FROM dispatch_settlement_customers GROUP BY dispatch_settlement_id',
      ') customer_summary ON customer_summary.dispatch_settlement_id = ds.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY ds.settlement_date DESC, ds.id DESC'
  }, reportInput);
}

async function discounts(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = ['dc.discount_amount > 0'];
  const params = [];
  addEquals(reportInput, 'store_id', 'dc.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'dr.salesman_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'dr.warehouse_id', conditions, params);
  addEquals(reportInput, 'customer_id', 'dc.customer_id', conditions, params);
  addDateRange(reportInput, 'dr.request_date', conditions, params);
  addSearch(reportInput, ['dr.dispatch_number', 'c.name', 's.full_name'], conditions, params);
  return pagedRows({
    select: 'dc.id AS dispatch_customer_id, dr.id AS dispatch_request_id, dr.dispatch_number, dr.request_date, dr.status AS dispatch_status, c.name AS customer_name, s.full_name AS salesman_name, w.name AS warehouse_name, dc.discount_type, dc.discount_value, dc.discount_amount, dc.subtotal_amount, dc.vat_amount, dc.customer_total_amount',
    from: 'dispatch_customers dc',
    joins: sql([
      'JOIN dispatch_requests dr ON dr.id = dc.dispatch_request_id',
      'JOIN customers c ON c.id = dc.customer_id',
      'JOIN salesmen s ON s.id = dr.salesman_id',
      'JOIN warehouses w ON w.id = dr.warehouse_id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY dr.request_date DESC, dc.id DESC'
  }, reportInput);
}

async function returns(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'ret.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'dr.salesman_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'dr.warehouse_id', conditions, params);
  addEquals(reportInput, 'customer_id', 'dc.customer_id', conditions, params);
  addEquals(reportInput, 'item_id', 'di.item_id', conditions, params);
  addDateRange(reportInput, 'ret.created_at', conditions, params);
  if (reportInput.post_settlement_exception) {
    conditions.push('posted_settlement.posted_at IS NOT NULL AND ret.created_at >= posted_settlement.posted_at');
  }
  addSearch(reportInput, ['dr.dispatch_number', 'c.name', 'di.item_name_snapshot', 'ret.reason'], conditions, params);
  return pagedRows({
    select: sql([
      'ret.*, dr.dispatch_number, dr.request_date, dr.status AS dispatch_status, s.full_name AS salesman_name, w.name AS warehouse_name,',
      'c.name AS customer_name, di.item_id, di.item_name_snapshot AS item_name, di.unit_label_snapshot AS unit_label, di.line_type,',
      'di.unit_price, di.unit_cost, note.credit_note_number, note.credit_note_date,',
      'COALESCE(note.subtotal_amount, ret.returned_quantity * di.unit_price) AS returned_subtotal_amount,',
      'COALESCE(note.vat_amount, 0) AS returned_vat_amount,',
      'COALESCE(note.total_amount, ret.returned_quantity * di.unit_price) AS returned_sales_value,',
      '(ret.returned_quantity * di.unit_cost) AS returned_cost,',
      'posted_settlement.posted_at AS settlement_posted_at,',
      "CASE WHEN posted_settlement.posted_at IS NOT NULL AND ret.created_at >= posted_settlement.posted_at THEN 1 ELSE 0 END AS post_settlement_exception,",
      "CASE WHEN posted_settlement.posted_at IS NOT NULL AND ret.created_at >= posted_settlement.posted_at AND posted_settlement.posted_at_is_estimated = 1 THEN 1 ELSE 0 END AS post_settlement_exception_estimated"
    ]),
    from: 'dispatch_returns ret',
    joins: sql([
      'JOIN dispatch_items di ON di.id = ret.dispatch_item_id',
      'JOIN dispatch_requests dr ON dr.id = ret.dispatch_request_id',
      'JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id',
      'JOIN customers c ON c.id = dc.customer_id',
      'JOIN salesmen s ON s.id = dr.salesman_id',
      'JOIN warehouses w ON w.id = dr.warehouse_id',
      'LEFT JOIN dispatch_return_credit_notes note ON note.dispatch_return_id = ret.id',
      `LEFT JOIN (
        SELECT dispatch_request_id, MAX(posted_at) AS posted_at,
          MAX(posted_at_is_estimated) AS posted_at_is_estimated
        FROM dispatch_settlements
        WHERE status = 'posted'
        GROUP BY dispatch_request_id
      ) posted_settlement ON posted_settlement.dispatch_request_id = ret.dispatch_request_id`
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY ret.created_at DESC, ret.id DESC'
  }, reportInput);
}

async function vatSummary(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'vat_rows.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'vat_rows.salesman_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'vat_rows.warehouse_id', conditions, params);
  addEquals(reportInput, 'customer_id', 'vat_rows.customer_id', conditions, params);
  addEquals(reportInput, 'invoice_status', 'vat_rows.invoice_status', conditions, params);
  addDateRange(reportInput, 'vat_rows.report_date', conditions, params);
  return pagedRows({
    select: 'vat_rows.report_date, vat_rows.invoice_status, SUM(vat_rows.document_count) AS invoice_count, SUM(vat_rows.taxable_sales) AS taxable_sales, SUM(vat_rows.output_vat) AS output_vat, SUM(vat_rows.gross_sales) AS gross_sales',
    from: sql([
      '(',
      'SELECT inv.store_id, dr.salesman_id, dr.warehouse_id, dc.customer_id, inv.invoice_date AS report_date, inv.status AS invoice_status,',
      '1 AS document_count, inv.subtotal_amount AS taxable_sales, inv.vat_amount AS output_vat, inv.total_amount AS gross_sales',
      'FROM invoices inv JOIN dispatch_requests dr ON dr.id = inv.dispatch_request_id JOIN dispatch_customers dc ON dc.id = inv.dispatch_customer_id',
      'UNION ALL',
      "SELECT note.store_id, dr.salesman_id, dr.warehouse_id, dc.customer_id, note.credit_note_date AS report_date, 'return_credit' AS invoice_status,",
      '-1 AS document_count, -note.subtotal_amount AS taxable_sales, -note.vat_amount AS output_vat, -note.total_amount AS gross_sales',
      'FROM dispatch_return_credit_notes note JOIN dispatch_requests dr ON dr.id = note.dispatch_request_id JOIN dispatch_customers dc ON dc.id = note.dispatch_customer_id',
      ') vat_rows'
    ]),
    joins: '',
    conditions,
    params,
    groupBy: 'GROUP BY vat_rows.report_date, vat_rows.invoice_status',
    orderBy: 'ORDER BY vat_rows.report_date DESC, vat_rows.invoice_status ASC'
  }, reportInput);
}

async function cashReconciliation(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'ft.store_id', conditions, params);
  addEquals(reportInput, 'cash_account_id', 'ft.cash_account_id', conditions, params);
  addDateRange(reportInput, 'ft.transaction_date', conditions, params);
  addSearch(reportInput, ['ca.account_name', 'ft.reference_type', 'ft.description'], conditions, params);
  return pagedRows({
    select: sql([
      'ca.id AS cash_account_id, ca.account_name, ca.account_type, ca.opening_balance, ca.current_balance,',
      'DATE(ft.transaction_date) AS report_date, COUNT(*) AS transaction_count,',
      "SUM(CASE WHEN ft.direction = 'in' THEN ft.amount ELSE 0 END) AS cash_in,",
      "SUM(CASE WHEN ft.direction = 'out' THEN ft.amount ELSE 0 END) AS cash_out,",
      "SUM(CASE WHEN ft.direction = 'in' THEN ft.amount ELSE -ft.amount END) AS net_movement"
    ]),
    from: 'financial_transactions ft',
    joins: 'JOIN cash_accounts ca ON ca.id = ft.cash_account_id',
    conditions,
    params,
    groupBy: 'GROUP BY ca.id, ca.account_name, ca.account_type, ca.opening_balance, ca.current_balance, DATE(ft.transaction_date)',
    orderBy: 'ORDER BY report_date DESC, ca.account_name ASC'
  }, reportInput);
}

async function productProfitability(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  physicalDispatchFilters(reportInput, conditions, params);
  addEquals(reportInput, 'customer_id', 'dc.customer_id', conditions, params);
  addEquals(reportInput, 'item_id', 'di.item_id', conditions, params);
  addEquals(reportInput, 'packaging_group_id', 'di.packaging_group_id', conditions, params);
  addSearch(reportInput, ['di.item_name_snapshot', 's.full_name', 'c.name'], conditions, params);
  return pagedRows({
    select: sql([
      'di.item_id, di.packaging_group_id, di.item_name_snapshot AS item_name, di.unit_label_snapshot AS unit_label,',
      "SUM(CASE WHEN di.line_type = 'sale' THEN di.quantity - di.returned_quantity ELSE 0 END) AS net_sale_quantity,",
      "SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / NULLIF(di.quantity, 0) ELSE 0 END) AS net_revenue,",
      "SUM(CASE WHEN di.line_type = 'sale' THEN COALESCE(costs.dispatched_cost, 0) ELSE 0 END) AS sales_cogs,",
      "SUM(CASE WHEN di.line_type = 'free_gift' THEN COALESCE(costs.dispatched_cost, 0) ELSE 0 END) AS gift_cogs,",
      "SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / NULLIF(di.quantity, 0) ELSE 0 END) - SUM(COALESCE(costs.dispatched_cost, 0)) AS gross_profit"
    ]),
    from: 'dispatch_items di',
    joins: sql([
      'JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id',
      'JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id',
      'JOIN customers c ON c.id = dc.customer_id',
      'JOIN salesmen s ON s.id = dr.salesman_id',
      'LEFT JOIN (SELECT dispatch_item_id, SUM(CASE WHEN status = \'dispatched\' THEN total_cost ELSE 0 END) AS dispatched_cost FROM dispatch_line_allocations GROUP BY dispatch_item_id) costs ON costs.dispatch_item_id = di.id'
    ]),
    conditions,
    params,
    groupBy: 'GROUP BY di.item_id, di.packaging_group_id, di.item_name_snapshot, di.unit_label_snapshot',
    orderBy: 'ORDER BY gross_profit DESC, item_name ASC'
  }, reportInput);
}

async function groupedProfitability(input, actor, grouping) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  physicalDispatchFilters(reportInput, conditions, params);
  grouping.filters.forEach(([key, column]) => addEquals(reportInput, key, column, conditions, params));
  addSearch(reportInput, grouping.search, conditions, params);
  return pagedRows({
    select: sql([
      grouping.select,
      "SUM(CASE WHEN di.line_type = 'sale' THEN di.quantity - di.returned_quantity ELSE 0 END) AS net_sale_quantity,",
      "SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / NULLIF(di.quantity, 0) ELSE 0 END) AS net_revenue,",
      "SUM(CASE WHEN di.line_type = 'sale' THEN COALESCE(costs.dispatched_cost, 0) ELSE 0 END) AS sales_cogs,",
      "SUM(CASE WHEN di.line_type = 'free_gift' THEN COALESCE(costs.dispatched_cost, 0) ELSE 0 END) AS gift_cogs,",
      "SUM(CASE WHEN di.line_type = 'sale' THEN di.subtotal_amount * (di.quantity - di.returned_quantity) / NULLIF(di.quantity, 0) ELSE 0 END) - SUM(COALESCE(costs.dispatched_cost, 0)) AS gross_profit"
    ]),
    from: 'dispatch_items di',
    joins: sql([
      'JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id',
      'JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id',
      'JOIN customers c ON c.id = dc.customer_id',
      'JOIN locations l ON l.id = dc.location_id',
      'JOIN sublocations sl ON sl.id = dc.sublocation_id',
      'LEFT JOIN (SELECT dispatch_item_id, SUM(CASE WHEN status = \'dispatched\' THEN total_cost ELSE 0 END) AS dispatched_cost FROM dispatch_line_allocations GROUP BY dispatch_item_id) costs ON costs.dispatch_item_id = di.id'
    ]),
    conditions,
    params,
    groupBy: grouping.groupBy,
    orderBy: `ORDER BY gross_profit DESC, ${grouping.orderBy}`
  }, reportInput);
}

function customerProfitability(input = {}, actor = {}) {
  return groupedProfitability(input, actor, {
    select: 'c.id AS customer_id, c.name AS customer_name, l.name AS location_name, sl.name AS sublocation_name,',
    filters: [['customer_id', 'dc.customer_id'], ['location_id', 'dc.location_id'], ['sublocation_id', 'dc.sublocation_id']],
    search: ['c.name', 'l.name', 'sl.name'],
    groupBy: 'GROUP BY c.id, c.name, l.name, sl.name',
    orderBy: 'customer_name ASC'
  });
}

function territoryProfitability(input = {}, actor = {}) {
  return groupedProfitability(input, actor, {
    select: 'l.id AS location_id, l.name AS location_name, sl.id AS sublocation_id, sl.name AS sublocation_name, COUNT(DISTINCT dc.customer_id) AS customer_count,',
    filters: [['location_id', 'dc.location_id'], ['sublocation_id', 'dc.sublocation_id']],
    search: ['l.name', 'sl.name'],
    groupBy: 'GROUP BY l.id, l.name, sl.id, sl.name',
    orderBy: 'location_name ASC, sublocation_name ASC'
  });
}

async function orderPipeline(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'dr.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'dr.salesman_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'dr.warehouse_id', conditions, params);
  addEquals(reportInput, 'status', 'dr.status', conditions, params);
  addDateRange(reportInput, 'dr.request_date', conditions, params);
  return pagedRows({
    select: sql([
      'dr.status, COUNT(*) AS order_count, SUM(dr.total_amount) AS order_value,',
      'AVG(CASE WHEN dr.status IN (\'draft\', \'pending_approval\', \'approved\') THEN DATEDIFF(CURDATE(), dr.request_date) ELSE 0 END) AS average_open_days,',
      "SUM(dr.status = 'draft') AS draft_count, SUM(dr.status = 'pending_approval') AS pending_approval_count,",
      "SUM(dr.status = 'approved') AS approved_count, SUM(dr.status = 'delivery') AS delivery_count,",
      "SUM(dr.status = 'partially_settled') AS partially_settled_count, SUM(dr.status = 'completed') AS completed_count"
    ]),
    from: 'dispatch_requests dr',
    conditions,
    params,
    groupBy: 'GROUP BY dr.status',
    orderBy: 'ORDER BY FIELD(dr.status, \'draft\', \'pending_approval\', \'approved\', \'delivery\', \'partially_settled\', \'completed\', \'cancelled\')'
  }, reportInput);
}

async function inventoryAging(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = ['lot.remaining_cartons > 0'];
  const params = [];
  addEquals(reportInput, 'store_id', 'lot.store_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'lot.warehouse_id', conditions, params);
  addEquals(reportInput, 'item_id', 'lot.item_id', conditions, params);
  addDateRange(reportInput, 'lot.received_at', conditions, params);
  addSearch(reportInput, ['i.name', 'i.code', 'w.name', 'lot.source_type'], conditions, params);
  return pagedRows({
    select: sql([
      'lot.*, i.name AS item_name, i.code AS item_code, w.name AS warehouse_name,',
      'DATEDIFF(CURDATE(), DATE(lot.received_at)) AS age_days,',
      '(lot.remaining_cartons * lot.unit_cost_per_carton) AS remaining_inventory_value'
    ]),
    from: 'carton_stock_lots lot',
    joins: sql(['JOIN items i ON i.id = lot.item_id', 'JOIN warehouses w ON w.id = lot.warehouse_id']),
    conditions,
    params,
    orderBy: 'ORDER BY age_days DESC, lot.received_at ASC, lot.id ASC'
  }, reportInput);
}

module.exports = {
  commissions,
  cashReconciliation,
  currentStock,
  customerBalances,
  customerProfitability,
  debts,
  deliveryCloseouts,
  discounts,
  dispatchSummary,
  gifts,
  invoices,
  normalStock,
  packagingOperations,
  packagingShortages,
  packagingStock,
  productProfitability,
  profitLoss,
  purchases,
  readyStock,
  salesmanPerformance,
  salesmanTargetProgress,
  sales,
  stockMovements,
  territoryProfitability,
  returns,
  vatSummary,
  orderPipeline,
  inventoryAging,
  _private: {
    pagedRows,
    physicalConditionsForDerived,
    PHYSICAL_DISPATCH_STATUSES
  }
};
