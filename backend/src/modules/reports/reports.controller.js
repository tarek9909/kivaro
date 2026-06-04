const reports = require('./reports.model');
const { sendCsv } = require('../../utils/csv');
const ApiError = require('../../utils/ApiError');
const { successResponse } = require('../../utils/response');

function assertCanExport(user = {}) {
  const permissions = new Set(user.permissions || []);
  if (!permissions.has('*') && !permissions.has('reports.export')) {
    throw ApiError.forbidden('You do not have permission to export reports');
  }
}

const SUMMARY_METRICS = {
  commissions: ['target_amount', 'sales_amount', 'total_commission'],
  current_stock: ['quantity_on_hand', 'quantity_reserved', 'quantity_available', 'stock_value'],
  customer_balances: [
    'total_debt_subtotal',
    'total_debt_vat',
    'total_debt_created',
    'total_debt_paid',
    'total_remaining_debt',
    'available_credit',
    'net_customer_balance'
  ],
  debts: ['subtotal_amount', 'vat_amount', 'original_amount', 'paid_amount', 'remaining_amount', 'debt_adjustment_amount', 'outstanding_debt_amount'],
  dispatch_summary: [
    'customers_count',
    'total_quantity',
    'subtotal_amount',
    'vat_amount',
    'total_amount',
    'returned_subtotal_amount',
    'returned_vat_amount',
    'returned_total_amount',
    'net_subtotal_amount',
    'net_vat_amount',
    'net_total_amount',
    'total_collected',
    'total_debt',
    'debt_adjustment_amount',
    'outstanding_debt_amount'
  ],
  profit_loss: [
    'sales_revenue',
    'sales_vat',
    'cost_of_goods_sold',
    'operating_expenses',
    'supplier_payments',
    'commission_payments',
    'debt_write_offs',
    'total_expense',
    'total_income',
    'net_profit'
  ],
  purchases: ['subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'amount_paid'],
  packaging_assignments: ['charcoal_quantity_kg', 'primary_container_count', 'total_packaging_cost', 'cost_per_kg'],
  packaging_shortages: ['required_quantity', 'available_quantity', 'shortage_quantity', 'total_cost'],
  salesman_target_progress: ['target_amount', 'achieved_sales_amount'],
  sales: [
    'quantity',
    'subtotal_amount',
    'vat_amount',
    'line_total',
    'returned_quantity',
    'returned_subtotal_amount',
    'returned_vat_amount',
    'returned_total_amount',
    'net_subtotal_amount',
    'net_vat_amount',
    'net_total_amount'
  ],
  stock_movements: ['quantity_change', 'reserved_quantity_change']
};

function buildSummary(rows = [], key) {
  const metrics = SUMMARY_METRICS[key] || [];
  const totals = {};
  for (const row of rows) {
    for (const metric of metrics) {
      const value = row?.[metric];
      if (value === null || value === '' || Number.isNaN(Number(value))) {
        continue;
      }
      totals[metric] = (totals[metric] || 0) + Number(value);
    }
  }

  return {
    rows: rows.length,
    totals,
    metrics
  };
}

function report(method, key, message) {
  return async (req, res) => {
    if (req.query.format === 'csv') {
      assertCanExport(req.user);
      const result = await method({ ...req.query, allRows: true }, req.user);
      return sendCsv(res, `${key}.csv`, result.rows);
    }

    const result = await method(req.query, req.user);
    const summaryResult = await method({ ...req.query, allRows: true }, req.user);
    const meta = {
      ...result.meta,
      summary: buildSummary(summaryResult.rows, key)
    };

    successResponse(res, { message, data: { [key]: result.rows }, meta });
  };
}

module.exports = {
  currentStock: report(reports.currentStock, 'current_stock', 'Current stock report fetched'),
  commissions: report(reports.commissions, 'commissions', 'Commissions report fetched'),
  customerBalances: report(reports.customerBalances, 'customer_balances', 'Customer balances report fetched'),
  debts: report(reports.debts, 'debts', 'Debts report fetched'),
  dispatchSummary: report(reports.dispatchSummary, 'dispatch_summary', 'Dispatch summary report fetched'),
  profitLoss: report(reports.profitLoss, 'profit_loss', 'Profit/loss report fetched'),
  purchases: report(reports.purchases, 'purchases', 'Purchases report fetched'),
  packagingAssignments: report(reports.packagingAssignments, 'packaging_assignments', 'Packaging assignments report fetched'),
  packagingShortages: report(reports.packagingShortages, 'packaging_shortages', 'Packaging shortages report fetched'),
  sales: report(reports.sales, 'sales', 'Sales report fetched'),
  stockMovements: report(reports.stockMovements, 'stock_movements', 'Stock movements report fetched'),
  salesmanTargetProgress: report(reports.salesmanTargetProgress, 'salesman_target_progress', 'Salesman target progress report fetched'),
  _private: {
    buildSummary,
    SUMMARY_METRICS
  }
};
