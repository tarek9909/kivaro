const { query } = require('../../bootstrap/db');
const { listRecords } = require('../../utils/crud');
const { scopedQuery } = require('../../utils/storeScope');

function viewReport(viewName, filters, orderBy) {
  return (input, actor = {}) => listRecords({
    select: 'SELECT *',
    from: viewName,
    filters: [...filters, { key: 'store_id', column: 'store_id' }],
    orderBy
  }, scopedQuery(input, actor));
}

const currentStock = viewReport('v_current_stock', [
  { key: 'warehouse_id', column: 'warehouse_id' },
  { key: 'item_id', column: 'item_id' },
  { key: 'item_variant_id', column: 'item_variant_id' },
  { key: 'item_type', column: 'item_type' },
  { key: 'search', type: 'search', fields: ['warehouse_name', 'item_name', 'variant_name', 'sku'] }
], 'ORDER BY warehouse_name ASC, item_name ASC, variant_name ASC');

const customerBalances = viewReport('v_customer_balances', [
  { key: 'customer_id', column: 'customer_id' },
  { key: 'search', type: 'search', fields: ['customer_name', 'location_name', 'sublocation_name'] }
], 'ORDER BY customer_name ASC');

const salesmanTargetProgress = viewReport('v_salesman_target_progress', [
  { key: 'salesman_id', column: 'salesman_id' },
  { key: 'location_id', column: 'location_id' },
  { key: 'sublocation_id', column: 'sublocation_id' },
  { key: 'date_from', column: 'period_start', operator: 'date_gte' },
  { key: 'date_to', column: 'period_end', operator: 'date_lte' },
  { key: 'search', type: 'search', fields: ['salesman_name', 'location_name', 'sublocation_name'] }
], 'ORDER BY period_start DESC, salesman_name ASC');

const dispatchSummaryBase = viewReport('v_dispatch_summary', [
  { key: 'status', column: 'status' },
  { key: 'date_from', column: 'request_date', operator: 'date_gte' },
  { key: 'date_to', column: 'request_date', operator: 'date_lte' },
  { key: 'search', type: 'search', fields: ['dispatch_number', 'salesman_name', 'warehouse_name'] }
], 'ORDER BY request_date DESC, dispatch_request_id DESC');

const dispatchSummary = (input = {}, actor = {}) =>
  dispatchSummaryBase(input, actor);

const sales = (input, actor = {}) => listRecords({
  select: `SELECT dr.id AS dispatch_request_id, dr.dispatch_number, dr.request_date,
    dr.status, s.full_name AS salesman_name, c.name AS customer_name,
    l.name AS location_name, sl.name AS sublocation_name, i.name AS item_name,
    iv.variant_name, di.quantity, di.unit_price, di.subtotal_amount, di.vat_rate,
    di.vat_amount, di.line_total, di.returned_quantity,
    CASE WHEN di.quantity > 0 THEN di.subtotal_amount * di.returned_quantity / di.quantity ELSE 0 END AS returned_subtotal_amount,
    CASE WHEN di.quantity > 0 THEN di.vat_amount * di.returned_quantity / di.quantity ELSE 0 END AS returned_vat_amount,
    CASE WHEN di.quantity > 0 THEN di.line_total * di.returned_quantity / di.quantity ELSE 0 END AS returned_total_amount,
    CASE WHEN di.quantity > 0 THEN di.subtotal_amount - (di.subtotal_amount * di.returned_quantity / di.quantity) ELSE di.subtotal_amount END AS net_subtotal_amount,
    CASE WHEN di.quantity > 0 THEN di.vat_amount - (di.vat_amount * di.returned_quantity / di.quantity) ELSE di.vat_amount END AS net_vat_amount,
    CASE WHEN di.quantity > 0 THEN di.line_total - (di.line_total * di.returned_quantity / di.quantity) ELSE di.line_total END AS net_total_amount,
    dc.collected_amount, dc.debt_amount, dc.payment_status`,
  from: 'dispatch_items di',
  joins: `
    JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
    JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id
    JOIN customers c ON c.id = dc.customer_id
    JOIN locations l ON l.id = dc.location_id
    JOIN sublocations sl ON sl.id = dc.sublocation_id
    JOIN salesmen s ON s.id = dr.salesman_id
    JOIN item_variants iv ON iv.id = di.item_variant_id
    JOIN items i ON i.id = iv.item_id`,
  filters: [
    { key: 'status', column: 'dr.status' },
    { key: 'store_id', column: 'dr.store_id' },
    { key: 'salesman_id', column: 'dr.salesman_id' },
    { key: 'customer_id', column: 'dc.customer_id' },
    { key: 'location_id', column: 'dc.location_id' },
    { key: 'sublocation_id', column: 'dc.sublocation_id' },
    { key: 'item_variant_id', column: 'di.item_variant_id' },
    { key: 'date_from', column: 'dr.request_date', operator: 'date_gte' },
    { key: 'date_to', column: 'dr.request_date', operator: 'date_lte' },
    { key: 'search', type: 'search', fields: ['dr.dispatch_number', 'c.name', 's.full_name', 'i.name', 'iv.variant_name'] }
  ],
  orderBy: 'ORDER BY dr.request_date DESC, dr.id DESC'
}, scopedQuery(input, actor));

const debts = (input, actor = {}) => listRecords({
  select: `SELECT cd.id, cd.customer_id, c.name AS customer_name, cd.salesman_id,
    s.full_name AS salesman_name, cd.dispatch_request_id, cd.debt_date,
    cd.subtotal_amount, cd.vat_amount, cd.original_amount, cd.paid_amount, cd.remaining_amount,
    COALESCE(adjustments.adjustment_amount, 0) AS debt_adjustment_amount,
    CASE WHEN cd.status IN ('pending','partially_paid') THEN cd.remaining_amount ELSE 0 END AS outstanding_debt_amount,
    cd.status,
    cd.due_date, cd.created_at`,
  from: 'customer_debts cd',
  joins: `
    JOIN customers c ON c.id = cd.customer_id
    LEFT JOIN salesmen s ON s.id = cd.salesman_id
    LEFT JOIN (
      SELECT customer_debt_id, COALESCE(SUM(amount), 0) AS adjustment_amount
      FROM customer_debt_adjustments
      GROUP BY customer_debt_id
    ) adjustments ON adjustments.customer_debt_id = cd.id`,
  filters: [
    { key: 'status', column: 'cd.status' },
    { key: 'store_id', column: 'cd.store_id' },
    { key: 'customer_id', column: 'cd.customer_id' },
    { key: 'salesman_id', column: 'cd.salesman_id' },
    { key: 'date_from', column: 'cd.debt_date', operator: 'date_gte' },
    { key: 'date_to', column: 'cd.debt_date', operator: 'date_lte' },
    { key: 'search', type: 'search', fields: ['c.name', 's.full_name'] }
  ],
  orderBy: 'ORDER BY cd.debt_date DESC, cd.id DESC'
}, scopedQuery(input, actor));

const purchases = (input, actor = {}) => listRecords({
  select: `SELECT po.id, po.po_number, po.supplier_id, s.name AS supplier_name,
    po.warehouse_id, w.name AS warehouse_name, po.order_date, po.expected_date,
    po.status, po.subtotal, po.discount_amount, po.tax_amount, po.total_amount,
    po.amount_paid, po.created_at`,
  from: 'purchase_orders po',
  joins: `
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    JOIN warehouses w ON w.id = po.warehouse_id`,
  filters: [
    { key: 'status', column: 'po.status' },
    { key: 'store_id', column: 'po.store_id' },
    { key: 'supplier_id', column: 'po.supplier_id' },
    { key: 'warehouse_id', column: 'po.warehouse_id' },
    { key: 'date_from', column: 'po.order_date', operator: 'date_gte' },
    { key: 'date_to', column: 'po.order_date', operator: 'date_lte' },
    { key: 'search', type: 'search', fields: ['po.po_number', 's.name'] }
  ],
  orderBy: 'ORDER BY po.order_date DESC, po.id DESC'
}, scopedQuery(input, actor));

const stockMovements = (input, actor = {}) => listRecords({
  select: `SELECT sm.id, sm.warehouse_id, w.name AS warehouse_name,
    sm.item_variant_id, i.name AS item_name, iv.variant_name, iv.sku,
    sm.movement_type, sm.quantity_change, sm.quantity_before,
    sm.quantity_after, sm.reserved_quantity_change, sm.reserved_quantity_before,
    sm.reserved_quantity_after, sm.unit_cost, sm.reference_type, sm.reference_id,
    sm.created_by, sm.created_at`,
  from: 'stock_movements sm',
  joins: `
    JOIN warehouses w ON w.id = sm.warehouse_id
    JOIN item_variants iv ON iv.id = sm.item_variant_id
    JOIN items i ON i.id = iv.item_id`,
  filters: [
    { key: 'warehouse_id', column: 'sm.warehouse_id' },
    { key: 'store_id', column: 'sm.store_id' },
    { key: 'item_variant_id', column: 'sm.item_variant_id' },
    { key: 'movement_type', column: 'sm.movement_type' },
    { key: 'reference_type', column: 'sm.reference_type' },
    { key: 'date_from', column: 'sm.created_at', operator: 'date_gte' },
    { key: 'date_to', column: 'sm.created_at', operator: 'date_lte' },
    { key: 'search', type: 'search', fields: ['w.name', 'i.name', 'iv.variant_name', 'iv.sku'] }
  ],
  orderBy: 'ORDER BY sm.created_at DESC, sm.id DESC'
}, scopedQuery(input, actor));

const packagingAssignments = (input, actor = {}) => listRecords({
  select: `SELECT
    pga.id, pga.packaging_group_id, pg.name AS packaging_group_name,
    pga.warehouse_id, w.name AS warehouse_name, pga.charcoal_variant_id,
    cv.variant_name AS charcoal_variant_name, cv.sku AS charcoal_sku,
    pga.charcoal_quantity_kg, pga.primary_container_count,
    pga.total_packaging_cost, pga.cost_per_kg, pga.status,
    pga.production_batch_id, pga.consumed_at, pga.created_at`,
  from: 'packaging_group_assignments pga',
  joins: `
    JOIN packaging_groups pg ON pg.id = pga.packaging_group_id
    JOIN warehouses w ON w.id = pga.warehouse_id
    JOIN item_variants cv ON cv.id = pga.charcoal_variant_id`,
  filters: [
    { key: 'store_id', column: 'pga.store_id' },
    { key: 'status', column: 'pga.status' },
    { key: 'warehouse_id', column: 'pga.warehouse_id' },
    { key: 'packaging_group_id', column: 'pga.packaging_group_id' },
    { key: 'production_batch_id', column: 'pga.production_batch_id' },
    { key: 'date_from', column: 'pga.created_at', operator: 'date_gte' },
    { key: 'date_to', column: 'pga.created_at', operator: 'date_lte' },
    { key: 'search', type: 'search', fields: ['pg.name', 'w.name', 'cv.variant_name', 'cv.sku'] }
  ],
  orderBy: 'ORDER BY pga.created_at DESC, pga.id DESC'
}, scopedQuery(input, actor));

const packagingShortages = (input, actor = {}) => listRecords({
  select: 'SELECT *',
  from: `(SELECT
      pga.id AS assignment_id, pga.store_id, pga.packaging_group_id,
      pg.name AS packaging_group_name, pga.warehouse_id, w.name AS warehouse_name,
      pga.status, req.component_id, req.item_variant_id, req.item_name,
      req.variant_name, req.sku, req.level_key, req.required_quantity,
      req.available_quantity, req.shortage_quantity, req.total_cost,
      pga.created_at
    FROM packaging_group_assignments pga
    JOIN JSON_TABLE(
        pga.calculation_json,
        '$.requirements[*]' COLUMNS (
          component_id BIGINT PATH '$.component_id',
          item_variant_id BIGINT PATH '$.item_variant_id',
          item_name VARCHAR(150) PATH '$.item_name',
          variant_name VARCHAR(150) PATH '$.variant_name',
          sku VARCHAR(100) PATH '$.sku',
          level_key VARCHAR(30) PATH '$.level_key',
          required_quantity DECIMAL(18,4) PATH '$.required_quantity',
          available_quantity DECIMAL(18,4) PATH '$.available_quantity',
          shortage_quantity DECIMAL(18,4) PATH '$.shortage_quantity',
          total_cost DECIMAL(18,4) PATH '$.total_cost'
        )
      ) req
    JOIN packaging_groups pg ON pg.id = pga.packaging_group_id
    JOIN warehouses w ON w.id = pga.warehouse_id
    WHERE req.shortage_quantity > 0) ps`,
  filters: [
    { key: 'store_id', column: 'ps.store_id' },
    { key: 'status', column: 'ps.status' },
    { key: 'warehouse_id', column: 'ps.warehouse_id' },
    { key: 'packaging_group_id', column: 'ps.packaging_group_id' },
    { key: 'item_variant_id', column: 'ps.item_variant_id' },
    { key: 'date_from', column: 'ps.created_at', operator: 'date_gte' },
    { key: 'date_to', column: 'ps.created_at', operator: 'date_lte' },
    { key: 'search', type: 'search', fields: ['ps.packaging_group_name', 'ps.warehouse_name', 'ps.item_name', 'ps.variant_name', 'ps.sku'] }
  ],
  orderBy: 'ORDER BY ps.shortage_quantity DESC, ps.created_at DESC'
}, scopedQuery(input, actor));

const commissions = (input, actor = {}) => listRecords({
  select: `SELECT cc.id, s.full_name AS salesman_name, sl.name AS sublocation_name,
    cc.period_start, cc.period_end, s.base_salary, cc.target_amount, cc.sales_amount,
    cc.total_commission, (s.base_salary + cc.total_commission) AS total_payable,
    cc.status, cc.created_at`,
  from: 'commission_calculations cc',
  joins: `
    JOIN salesmen s ON s.id = cc.salesman_id
    JOIN sublocations sl ON sl.id = cc.sublocation_id`,
  filters: [
    { key: 'status', column: 'cc.status' },
    { key: 'store_id', column: 'cc.store_id' },
    { key: 'salesman_id', column: 'cc.salesman_id' },
    { key: 'sublocation_id', column: 'cc.sublocation_id' },
    { key: 'date_from', column: 'cc.period_start', operator: 'date_gte' },
    { key: 'date_to', column: 'cc.period_end', operator: 'date_lte' },
    { key: 'search', type: 'search', fields: ['s.full_name', 'sl.name'] }
  ],
  orderBy: 'ORDER BY cc.period_start DESC, cc.id DESC'
}, scopedQuery(input, actor));

async function profitLoss(input = {}, actor = {}) {
  const scopedInput = scopedQuery(input, actor);
  const storeId = scopedInput.store_id;
  const dispatchConditions = ['dr.store_id = ?', "dr.status = 'completed'"];
  const dispatchParams = [storeId];
  const transactionConditions = ['store_id = ?'];
  const transactionParams = [storeId];
  const debtConditions = ['store_id = ?', "adjustment_type = 'write_off'"];
  const debtParams = [storeId];

  if (scopedInput.date_from) {
    dispatchConditions.push('DATE(COALESCE(dr.completed_at, dr.request_date)) >= ?');
    dispatchParams.push(scopedInput.date_from);
    transactionConditions.push('DATE(transaction_date) >= ?');
    transactionParams.push(scopedInput.date_from);
    debtConditions.push('DATE(created_at) >= ?');
    debtParams.push(scopedInput.date_from);
  }

  if (scopedInput.date_to) {
    dispatchConditions.push('DATE(COALESCE(dr.completed_at, dr.request_date)) <= ?');
    dispatchParams.push(scopedInput.date_to);
    transactionConditions.push('DATE(transaction_date) <= ?');
    transactionParams.push(scopedInput.date_to);
    debtConditions.push('DATE(created_at) <= ?');
    debtParams.push(scopedInput.date_to);
  }

  const dispatchWhere = `WHERE ${dispatchConditions.join(' AND ')}`;
  const transactionWhere = `WHERE ${transactionConditions.join(' AND ')}`;
  const debtWhere = `WHERE ${debtConditions.join(' AND ')}`;
  const rows = await query(
    `SELECT
      sales.sales_revenue,
      sales.sales_vat,
      sales.cost_of_goods_sold,
      expenses.operating_expenses,
      expenses.supplier_payments,
      expenses.commission_payments,
      writeoffs.debt_write_offs,
      (
        sales.cost_of_goods_sold +
        expenses.operating_expenses +
        expenses.commission_payments +
        writeoffs.debt_write_offs
      ) AS total_expense,
      sales.sales_revenue AS total_income,
      (
        sales.sales_revenue -
        sales.cost_of_goods_sold -
        expenses.operating_expenses -
        expenses.commission_payments -
        writeoffs.debt_write_offs
      ) AS net_profit
     FROM (
       SELECT
         COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.subtotal_amount - (di.subtotal_amount * di.returned_quantity / di.quantity) ELSE di.subtotal_amount END), 0) AS sales_revenue,
         COALESCE(SUM(CASE WHEN di.quantity > 0 THEN di.vat_amount - (di.vat_amount * di.returned_quantity / di.quantity) ELSE di.vat_amount END), 0) AS sales_vat,
         COALESCE(SUM(CASE WHEN di.quantity > 0 THEN (di.quantity - di.returned_quantity) * di.unit_cost ELSE di.quantity * di.unit_cost END), 0) AS cost_of_goods_sold
       FROM dispatch_items di
       JOIN dispatch_requests dr ON dr.id = di.dispatch_request_id
       ${dispatchWhere}
     ) sales
     CROSS JOIN (
       SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS operating_expenses,
         COALESCE(SUM(CASE WHEN transaction_type = 'supplier_payment' THEN amount ELSE 0 END), 0) AS supplier_payments,
         COALESCE(SUM(CASE WHEN transaction_type = 'commission_payment' THEN amount ELSE 0 END), 0) AS commission_payments
       FROM financial_transactions
       ${transactionWhere}
     ) expenses
     CROSS JOIN (
       SELECT COALESCE(SUM(amount), 0) AS debt_write_offs
       FROM customer_debt_adjustments
       ${debtWhere}
     ) writeoffs`,
    [...dispatchParams, ...transactionParams, ...debtParams]
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
  packagingAssignments,
  packagingShortages,
  profitLoss,
  purchases,
  salesmanTargetProgress,
  sales,
  stockMovements
};
