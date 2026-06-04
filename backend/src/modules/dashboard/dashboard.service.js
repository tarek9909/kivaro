const { resolveStoreId } = require('../../utils/storeScope');
const model = require('./dashboard.model');

function pct(done, total) {
  const totalNumber = Number(total || 0);
  if (totalNumber <= 0) return 0;
  return Math.round((Number(done || 0) / totalNumber) * 100);
}

function money(value) {
  return Number(value || 0);
}

function formatMovement(row) {
  const change = Number(row.quantity_change || 0);
  const direction = change >= 0 ? 'Added' : 'Removed';
  const movementLabel = String(row.movement_type || 'movement').replace(/_/g, ' ');

  return {
    id: row.id,
    tag: movementLabel,
    title: `${direction} ${Math.abs(change)} units`,
    description: `${row.item_name || 'Item'}${row.variant_name ? ` (${row.variant_name})` : ''} at ${row.warehouse_name || 'warehouse'}`,
    reference: `${row.reference_type || 'movement'} #${row.reference_id || row.id}`,
    created_at: row.created_at
  };
}

async function getDashboard(actor = {}) {
  const storeId = resolveStoreId(actor, {}, { requireForSuperadmin: false });

  if (!storeId) {
    return {
      summary: {},
      benchmarks: [],
      activity: [],
      notifications: []
    };
  }

  const [summary, benchmarks, activity, notifications] = await Promise.all([
    model.getSummary(storeId),
    model.getBenchmarks(storeId),
    model.getActivity(storeId),
    model.getNotifications(storeId, actor.id)
  ]);

  return {
    summary: {
      monthly_collections: money(summary.monthly_collections),
      cash_balance: money(summary.cash_balance),
      open_receivables: money(summary.open_receivables),
      active_dispatches: Number(summary.active_dispatches || 0),
      active_batches: Number(summary.active_batches || 0),
      unavailable_stock_variants: Number(summary.unavailable_stock_variants || 0)
    },
    benchmarks: [
      {
        key: 'dispatch_completion',
        label: 'Outbound dispatch completion',
        value: pct(benchmarks.dispatch_done, benchmarks.dispatch_total),
        done: Number(benchmarks.dispatch_done || 0),
        total: Number(benchmarks.dispatch_total || 0)
      },
      {
        key: 'production_completion',
        label: 'Production batch completion',
        value: pct(benchmarks.production_done, benchmarks.production_total),
        done: Number(benchmarks.production_done || 0),
        total: Number(benchmarks.production_total || 0)
      },
      {
        key: 'salesman_target_progress',
        label: 'Salesman target progress',
        value: Math.round(Number(benchmarks.target_progress || 0)),
        done: null,
        total: null
      },
      {
        key: 'purchase_receiving',
        label: 'Supplier orders received',
        value: pct(benchmarks.purchase_done, benchmarks.purchase_total),
        done: Number(benchmarks.purchase_done || 0),
        total: Number(benchmarks.purchase_total || 0)
      }
    ],
    activity: activity.map(formatMovement),
    notifications
  };
}

module.exports = {
  getDashboard
};
