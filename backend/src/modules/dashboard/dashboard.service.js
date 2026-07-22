const { resolveStoreId } = require('../../utils/storeScope');
const model = require('./dashboard.model');

function percentage(done, total) {
  const denominator = Number(total || 0);
  if (denominator <= 0) return 0;
  return Math.round((Number(done || 0) / denominator) * 100);
}

function number(value) {
  return Number(value || 0);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeDateRange(input = {}) {
  const today = new Date();
  const todayValue = isoDate(today);
  if (input.date_from && input.date_to) {
    return { date_from: input.date_from, date_to: input.date_to };
  }
  if (input.date_from) {
    return { date_from: input.date_from, date_to: todayValue };
  }
  if (input.date_to) {
    const end = new Date(input.date_to + 'T00:00:00.000Z');
    return {
      date_from: isoDate(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))),
      date_to: input.date_to
    };
  }
  return {
    date_from: isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))),
    date_to: todayValue
  };
}

function formatMovement(row) {
  const change = number(row.quantity_change);
  const direction = change >= 0 ? 'Added' : 'Removed';
  const movementLabel = String(row.movement_type || 'movement').replace(/_/g, ' ');
  const unit = row.unit_label || 'units';
  return {
    id: row.id,
    source: row.source,
    tag: movementLabel,
    title: direction + ' ' + Math.abs(change) + ' ' + unit,
    description: (row.item_name || 'Item') + ' at ' + (row.warehouse_name || 'warehouse'),
    reference: (row.reference_type || 'movement') + ' #' + (row.reference_id || row.id),
    created_at: row.created_at
  };
}

function normalizeFinancials(row = {}) {
  return {
    sales_revenue: number(row.sales_revenue),
    sales_cogs: number(row.sales_cogs),
    gift_cogs: number(row.gift_cogs),
    operating_expenses: number(row.operating_expenses),
    commission_expenses: number(row.commission_expenses),
    debt_write_offs: number(row.debt_write_offs),
    gross_profit_after_gifts: number(row.gross_profit_after_gifts),
    net_profit: number(row.net_profit)
  };
}

function normalizeChart(rows = []) {
  return rows.map((row) => ({
    chart_date: row.chart_date,
    sales_revenue: number(row.sales_revenue),
    sales_cogs: number(row.sales_cogs),
    gift_cogs: number(row.gift_cogs),
    gross_profit_after_gifts: number(row.gross_profit_after_gifts)
  }));
}

function normalizePosWork(rows = []) {
  return rows.map((row) => ({
    ...row,
    pending_order_count: number(row.pending_order_count),
    pending_customer_count: number(row.pending_customer_count),
    pending_sale_total: number(row.pending_sale_total),
    requested_gift_quantity: number(row.requested_gift_quantity),
    requested_gift_line_count: number(row.requested_gift_line_count)
  }));
}

function normalizeShortages(rows = []) {
  return rows.map((row) => ({
    ...row,
    required_quantity: number(row.required_quantity),
    quantity_on_hand: number(row.quantity_on_hand),
    quantity_reserved: number(row.quantity_reserved),
    available_quantity: number(row.available_quantity),
    shortage_quantity: number(row.shortage_quantity)
  }));
}

async function getDashboard(actor = {}, input = {}) {
  const storeId = resolveStoreId(actor, input, { requireForSuperadmin: false });
  if (!storeId) {
    return {
      summary: {},
      financial: {},
      benchmarks: [],
      activity: [],
      pending_pos_work: [],
      packaging_shortages: [],
      sales_chart: [],
      notifications: [],
      date_range: {}
    };
  }

  const filters = normalizeDateRange(input);
  const [
    summaryRow,
    financialRow,
    benchmarkRow,
    activity,
    notifications,
    packagingShortages,
    pendingPosWork,
    salesChart,
    packagingShortageCount
  ] = await Promise.all([
    model.getSummary(storeId, filters),
    model.getFinancialSummary(storeId, filters),
    model.getBenchmarks(storeId, filters),
    model.getActivity(storeId),
    model.getNotifications(storeId, actor.id),
    model.getPackagingShortages(storeId),
    model.getPendingPosWork(storeId, filters),
    model.getSalesChart(storeId, filters),
    model.getPackagingShortageCount(storeId)
  ]);
  const financial = normalizeFinancials(financialRow);
  const lowStockBalances = number(summaryRow.low_stock_balances);
  const totalStockBalances = number(summaryRow.stock_balance_count);
  const healthyStockBalances = Math.max(totalStockBalances - lowStockBalances, 0);

  return {
    date_range: filters,
    summary: {
      collections: number(summaryRow.collections),
      cash_balance: number(summaryRow.cash_balance),
      open_receivables: number(summaryRow.open_receivables),
      active_dispatches: number(summaryRow.active_dispatches),
      pending_pos_orders: number(summaryRow.pending_pos_orders),
      pending_pos_salesmen: number(summaryRow.pending_pos_salesmen),
      packaging_shortage_count: number(packagingShortageCount),
      raw_stock_value: number(summaryRow.raw_stock_value),
      packaging_stock_value: number(summaryRow.packaging_stock_value),
      ready_stock_value: number(summaryRow.ready_stock_value),
      stock_balance_count: totalStockBalances,
      low_stock_balances: lowStockBalances,
      healthy_stock_balances: healthyStockBalances,
      ...financial
    },
    financial,
    benchmarks: [
      {
        key: 'dispatch_completion',
        label: 'Dispatch completion',
        value: percentage(benchmarkRow.dispatch_done, benchmarkRow.dispatch_total),
        done: number(benchmarkRow.dispatch_done),
        total: number(benchmarkRow.dispatch_total)
      },
      {
        key: 'pos_conversion',
        label: 'POS orders converted',
        value: percentage(benchmarkRow.pos_converted, benchmarkRow.pos_total),
        done: number(benchmarkRow.pos_converted),
        total: number(benchmarkRow.pos_total)
      },
      {
        key: 'stock_health',
        label: 'Stock balances above reorder level',
        value: percentage(healthyStockBalances, totalStockBalances),
        done: healthyStockBalances,
        total: totalStockBalances
      },
      {
        key: 'collection_rate',
        label: 'Collections against dispatched value',
        value: percentage(benchmarkRow.collected_value, benchmarkRow.dispatched_value),
        done: number(benchmarkRow.collected_value),
        total: number(benchmarkRow.dispatched_value)
      }
    ],
    activity: activity.map(formatMovement),
    pending_pos_work: normalizePosWork(pendingPosWork),
    packaging_shortages: normalizeShortages(packagingShortages),
    sales_chart: normalizeChart(salesChart),
    notifications
  };
}

module.exports = {
  getDashboard,
  _private: {
    normalizeDateRange,
    normalizeFinancials,
    normalizeChart,
    normalizePosWork,
    normalizeShortages
  }
};
