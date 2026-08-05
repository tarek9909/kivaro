const { resolveStoreId } = require('../../utils/storeScope');
const model = require('./dashboard.model');

function hasPermission(actor = {}, permission) {
  if (actor.is_superadmin) return true;
  const permissions = new Set(actor.permissions || []);
  return permissions.has('*') || permissions.has(permission);
}

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
    payroll_expenses: number(row.payroll_expenses),
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
      packaging_shortages: [],
      sales_chart: [],
      notifications: [],
      date_range: {}
    };
  }

  const filters = normalizeDateRange(input);
  const canSeeFinance = hasPermission(actor, 'accounting.view') || hasPermission(actor, 'reports.view');
  const canSeeInventory = hasPermission(actor, 'inventory.view');
  const canSeePackaging = canSeeInventory
    || hasPermission(actor, 'inventory.create')
    || hasPermission(actor, 'inventory.update')
    || hasPermission(actor, 'inventory.delete')
    || hasPermission(actor, 'stock.adjust');
  const canSeeActivity = canSeeInventory
    || hasPermission(actor, 'stock.movements')
    || hasPermission(actor, 'stock.adjust');
  const canSeeDispatch = [
    'dispatch.view', 'dispatch.create', 'dispatch.approve', 'dispatch.settle', 'dispatch.print',
    'delivery.release', 'delivery.dispatch', 'delivery.record_returns', 'delivery.closeout',
    'finance.settle_deliveries'
  ].some((permission) => hasPermission(actor, permission));
  const [
    summaryRow,
    financialRow,
    benchmarkRow,
    activity,
    notifications,
    packagingShortages,
    salesChart,
    packagingShortageCount
  ] = await Promise.all([
    model.getSummary(storeId, filters),
    model.getFinancialSummary(storeId, filters),
    model.getBenchmarks(storeId, filters),
    model.getActivity(storeId),
    model.getNotifications(storeId, actor.id),
    model.getPackagingShortages(storeId),
    model.getSalesChart(storeId, filters),
    model.getPackagingShortageCount(storeId)
  ]);
  const financial = canSeeFinance ? normalizeFinancials(financialRow) : {};
  const lowStockBalances = number(summaryRow.low_stock_balances);
  const totalStockBalances = number(summaryRow.stock_balance_count);
  const healthyStockBalances = Math.max(totalStockBalances - lowStockBalances, 0);

  return {
    date_range: filters,
    summary: {
      ...(canSeeFinance ? {
        collections: number(summaryRow.collections),
        cash_balance: number(summaryRow.cash_balance),
        open_receivables: number(summaryRow.open_receivables),
        ...financial
      } : {}),
      ...(canSeeDispatch ? { active_dispatches: number(summaryRow.active_dispatches) } : {}),
      ...(canSeePackaging ? { packaging_shortage_count: number(packagingShortageCount) } : {}),
      ...(canSeeInventory ? {
        raw_stock_value: number(summaryRow.raw_stock_value),
        packaging_stock_value: number(summaryRow.packaging_stock_value),
        ready_stock_value: number(summaryRow.ready_stock_value),
        stock_balance_count: totalStockBalances,
        low_stock_balances: lowStockBalances,
        healthy_stock_balances: healthyStockBalances
      } : {}),
    },
    financial,
    benchmarks: [
      ...(canSeeDispatch ? [{
        key: 'dispatch_completion',
        label: 'Dispatch completion',
        value: percentage(benchmarkRow.dispatch_done, benchmarkRow.dispatch_total),
        done: number(benchmarkRow.dispatch_done),
        total: number(benchmarkRow.dispatch_total)
      }] : []),
      ...(canSeeInventory ? [{
        key: 'stock_health',
        label: 'Stock balances above reorder level',
        value: percentage(healthyStockBalances, totalStockBalances),
        done: healthyStockBalances,
        total: totalStockBalances
      }] : []),
      ...(canSeeFinance ? [{
        key: 'collection_rate',
        label: 'Collections against dispatched value',
        value: percentage(benchmarkRow.collected_value, benchmarkRow.dispatched_value),
        done: number(benchmarkRow.collected_value),
        total: number(benchmarkRow.dispatched_value)
      }] : [])
    ],
    activity: canSeeActivity ? activity.map(formatMovement) : [],
    packaging_shortages: canSeePackaging ? normalizeShortages(packagingShortages) : [],
    sales_chart: canSeeFinance ? normalizeChart(salesChart) : [],
    notifications
  };
}

module.exports = {
  getDashboard,
  _private: {
    normalizeDateRange,
    normalizeFinancials,
    normalizeChart,
    normalizeShortages
  }
};
