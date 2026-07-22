const { query } = require('../../bootstrap/db');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { scopedQuery } = require('../../utils/storeScope');

const PHYSICAL_DISPATCH_STATUSES = ['dispatched', 'partially_settled', 'completed'];

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

  return {
    rows,
    meta: getPaginationMeta({
      ...pagination,
      total: Number(countRows[0]?.total || 0)
    })
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
      'i.loose_units_per_carton, i.max_content_weight_kg, i.status AS item_status,',
      "CASE WHEN cs.stock_mode = 'carton_weight' THEN cs.quantity_on_hand / NULLIF(i.kg_per_carton, 0) ELSE NULL END AS sealed_carton_equivalent"
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
      '    ism.carton_stock_lot_id, ism.open_carton_shelf_id, ism.notes, ism.created_by, ism.created_at',
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
  conditions.push(alias + ".status IN ('dispatched', 'partially_settled', 'completed')");
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

async function posOrders(input = {}, actor = {}) {
  const reportInput = scoped(input, actor);
  const conditions = [];
  const params = [];
  addEquals(reportInput, 'store_id', 'po.store_id', conditions, params);
  addEquals(reportInput, 'salesman_id', 'po.salesman_id', conditions, params);
  addEquals(reportInput, 'warehouse_id', 'po.warehouse_id', conditions, params);
  addEquals(reportInput, 'customer_id', 'po.customer_id', conditions, params);
  addEquals(reportInput, 'location_id', 'po.location_id', conditions, params);
  addEquals(reportInput, 'sublocation_id', 'po.sublocation_id', conditions, params);
  addEquals(reportInput, 'pos_status', 'po.status', conditions, params);
  addEquals(reportInput, 'status', 'po.status', conditions, params);
  addDateRange(reportInput, 'po.order_date', conditions, params);
  addSearch(reportInput, ['po.order_number', 's.full_name', 'c.name', 'w.name'], conditions, params);
  return pagedRows({
    select: sql([
      'po.*, s.full_name AS salesman_name, c.name AS customer_name,',
      'l.name AS location_name, sl.name AS sublocation_name, w.name AS warehouse_name,',
      'dr.dispatch_number, dr.status AS dispatch_status,',
      'COALESCE(line_summary.sale_quantity, 0) AS sale_quantity,',
      'COALESCE(line_summary.gift_quantity, 0) AS gift_quantity,',
      'COALESCE(line_summary.sale_subtotal, 0) AS sale_subtotal,',
      'COALESCE(line_summary.sale_vat, 0) AS sale_vat,',
      'COALESCE(line_summary.sale_total, 0) AS sale_total,',
      'COALESCE(line_summary.gift_line_count, 0) AS gift_line_count'
    ]),
    from: 'pos_orders po',
    joins: sql([
      'JOIN salesmen s ON s.id = po.salesman_id',
      'JOIN customers c ON c.id = po.customer_id',
      'JOIN locations l ON l.id = po.location_id',
      'JOIN sublocations sl ON sl.id = po.sublocation_id',
      'JOIN warehouses w ON w.id = po.warehouse_id',
      'LEFT JOIN dispatch_requests dr ON dr.id = po.dispatch_request_id',
      'LEFT JOIN (',
      '  SELECT pos_order_id,',
      "    SUM(CASE WHEN line_type = 'sale' THEN quantity ELSE 0 END) AS sale_quantity,",
      "    SUM(CASE WHEN line_type = 'free_gift' THEN quantity ELSE 0 END) AS gift_quantity,",
      "    SUM(CASE WHEN line_type = 'sale' THEN quantity * unit_price ELSE 0 END) AS sale_subtotal,",
      "    SUM(CASE WHEN line_type = 'sale' THEN quantity * unit_price * vat_rate / 100 ELSE 0 END) AS sale_vat,",
      "    SUM(CASE WHEN line_type = 'sale' THEN quantity * unit_price * (1 + vat_rate / 100) ELSE 0 END) AS sale_total,",
      "    SUM(line_type = 'free_gift') AS gift_line_count",
      '  FROM pos_order_lines',
      '  GROUP BY pos_order_id',
      ') line_summary ON line_summary.pos_order_id = po.id'
    ]),
    conditions,
    params,
    orderBy: 'ORDER BY po.order_date DESC, po.created_at DESC, po.id DESC'
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
    alias + ".status IN ('dispatched', 'partially_settled', 'completed')"
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
  const posParams = [reportInput.store_id];
  const dispatchWhere = physicalConditionsForDerived(reportInput, 'dr', dispatchParams).join(' AND ');
  const customerWhere = physicalConditionsForDerived(reportInput, 'dr', customerParams).join(' AND ');
  const lineWhere = physicalConditionsForDerived(reportInput, 'dr', lineParams).join(' AND ');
  const posConditions = ['po.store_id = ?'];
  if (reportInput.date_from) {
    posConditions.push('DATE(po.order_date) >= ?');
    posParams.push(reportInput.date_from);
  }
  if (reportInput.date_to) {
    posConditions.push('DATE(po.order_date) <= ?');
    posParams.push(reportInput.date_to);
  }
  const conditions = ['s.store_id = ?'];
  const params = [
    ...dispatchParams,
    ...customerParams,
    ...lineParams,
    ...posParams,
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
      '(COALESCE(line_summary.sales_revenue, 0) - COALESCE(line_summary.sales_cogs, 0) - COALESCE(line_summary.gift_cogs, 0)) AS gross_profit_after_gifts,',
      'COALESCE(pos_summary.pending_pos_orders, 0) AS pending_pos_orders,',
      'COALESCE(pos_summary.converted_pos_orders, 0) AS converted_pos_orders'
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
      ') line_summary ON line_summary.salesman_id = s.id',
      'LEFT JOIN (',
      '  SELECT po.salesman_id,',
      "    SUM(po.status = 'pending') AS pending_pos_orders,",
      "    SUM(po.status = 'converted') AS converted_pos_orders",
      '  FROM pos_orders po',
      '  WHERE ' + posConditions.join(' AND '),
      '  GROUP BY po.salesman_id',
      ') pos_summary ON pos_summary.salesman_id = s.id'
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
      '(s.base_salary + cc.total_commission) AS total_payable,',
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
  const supplierConditions = ['sp.store_id = ?'];
  const supplierParams = [reportInput.store_id];
  const writeoffConditions = ["cda.store_id = ?", "cda.adjustment_type = 'write_off'"];
  const writeoffParams = [reportInput.store_id];
  addDateRange(reportInput, 'e.expense_date', expenseConditions, expenseParams);
  addDateRange(reportInput, 'cp.payment_date', commissionConditions, commissionParams);
  addDateRange(reportInput, 'sp.payment_date', supplierConditions, supplierParams);
  addDateRange(reportInput, 'cda.adjustment_date', writeoffConditions, writeoffParams);
  const rows = await query(
    sql([
      'SELECT sales.sales_revenue, sales.sales_vat, sales.sales_cogs, sales.gift_cogs,',
      '(sales.sales_revenue - sales.sales_cogs) AS gross_profit_before_gifts,',
      '(sales.sales_revenue - sales.sales_cogs - sales.gift_cogs) AS gross_profit_after_gifts,',
      'expenses.operating_expenses, commissions.commission_expenses, writeoffs.debt_write_offs,',
      'supplier_cash.supplier_payments_cash_outflow,',
      '(sales.sales_cogs + sales.gift_cogs + expenses.operating_expenses + commissions.commission_expenses + writeoffs.debt_write_offs) AS total_expense,',
      'sales.sales_revenue AS total_income,',
      '(sales.sales_revenue - sales.sales_cogs - sales.gift_cogs - expenses.operating_expenses - commissions.commission_expenses - writeoffs.debt_write_offs) AS net_profit',
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
      '  WHERE ' + commissionConditions.join(' AND '),
      ') commissions',
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

module.exports = {
  commissions,
  currentStock,
  customerBalances,
  debts,
  dispatchSummary,
  gifts,
  invoices,
  normalStock,
  packagingOperations,
  packagingShortages,
  packagingStock,
  posOrders,
  profitLoss,
  purchases,
  readyStock,
  salesmanPerformance,
  salesmanTargetProgress,
  sales,
  stockMovements,
  _private: {
    pagedRows,
    physicalConditionsForDerived,
    PHYSICAL_DISPATCH_STATUSES
  }
};
