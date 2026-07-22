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
  commissions: [
    'target_amount',
    'sales_amount',
    'base_salary',
    'total_commission',
    'total_payable'
  ],
  current_stock: [
    'quantity_on_hand',
    'quantity_reserved',
    'quantity_available',
    'stock_value'
  ],
  normal_stock: [
    'quantity_on_hand',
    'quantity_reserved',
    'quantity_available',
    'stock_value'
  ],
  packaging_stock: [
    'quantity_on_hand',
    'quantity_reserved',
    'quantity_available',
    'stock_value'
  ],
  ready_stock: [
    'initial_inner_quantity',
    'remaining_inner_quantity',
    'reserved_inner_quantity',
    'available_inner_quantity',
    'remaining_cost',
    'capacity_kg'
  ],
  customer_balances: [
    'total_debt_subtotal',
    'total_debt_vat',
    'total_debt_created',
    'total_debt_paid',
    'total_remaining_debt',
    'available_credit',
    'net_customer_balance',
    'invoice_total',
    'receipt_total',
    'payment_total'
  ],
  debts: [
    'subtotal_amount',
    'vat_amount',
    'original_amount',
    'paid_amount',
    'remaining_amount',
    'debt_adjustment_amount',
    'outstanding_debt_amount'
  ],
  dispatch_summary: [
    'customers_count',
    'total_quantity',
    'subtotal_amount',
    'vat_amount',
    'total_amount',
    'net_total_amount',
    'total_collected',
    'total_debt',
    'gift_cogs',
    'dispatched_cogs',
    'dispatched_gift_cogs'
  ],
  gifts: [
    'quantity',
    'returned_quantity',
    'net_quantity',
    'dispatched_cogs',
    'returned_cogs'
  ],
  invoices: [
    'subtotal_amount',
    'vat_amount',
    'total_amount',
    'collected_amount',
    'debt_amount',
    'gift_cogs'
  ],
  packaging_operations: [
    'output_carton_count',
    'raw_quantity_kg',
    'packaging_cost',
    'total_cost',
    'cost_per_outer',
    'cost_per_inner',
    'container_count'
  ],
  packaging_shortages: [
    'required_quantity',
    'quantity_on_hand',
    'quantity_reserved',
    'available_quantity',
    'shortage_quantity'
  ],
  pos_orders: [
    'sale_quantity',
    'gift_quantity',
    'sale_subtotal',
    'sale_vat',
    'sale_total',
    'gift_line_count'
  ],
  profit_loss: [
    'sales_revenue',
    'sales_vat',
    'sales_cogs',
    'gift_cogs',
    'gross_profit_before_gifts',
    'gross_profit_after_gifts',
    'operating_expenses',
    'commission_expenses',
    'debt_write_offs',
    'supplier_payments_cash_outflow',
    'total_expense',
    'total_income',
    'net_profit'
  ],
  purchases: [
    'subtotal',
    'discount_amount',
    'tax_amount',
    'total_amount',
    'amount_paid',
    'ordered_quantity',
    'received_quantity'
  ],
  salesman_performance: [
    'dispatch_count',
    'delivered_customer_count',
    'total_collected',
    'total_debt',
    'sales_revenue',
    'sales_vat',
    'sales_cogs',
    'gift_quantity',
    'gift_cogs',
    'gross_profit_after_gifts',
    'pending_pos_orders',
    'converted_pos_orders'
  ],
  salesman_target_progress: [
    'base_salary',
    'target_amount',
    'achieved_sales_amount',
    'achievement_percentage'
  ],
  sales: [
    'quantity',
    'returned_quantity',
    'net_quantity',
    'subtotal_amount',
    'vat_amount',
    'line_total',
    'net_subtotal_amount',
    'net_vat_amount',
    'net_total_amount',
    'dispatched_cogs',
    'returned_cogs'
  ],
  stock_movements: [
    'quantity_change',
    'reserved_quantity_change',
    'total_cost'
  ]
};

function buildSummary(rows = [], key) {
  const metrics = SUMMARY_METRICS[key] || [];
  const totals = {};
  for (const row of rows) {
    for (const metric of metrics) {
      const value = row?.[metric];
      if (value === null || value === '' || Number.isNaN(Number(value))) continue;
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
      return sendCsv(res, key + '.csv', result.rows);
    }

    const result = await method(req.query, req.user);
    const summaryResult = await method({ ...req.query, allRows: true }, req.user);
    return successResponse(res, {
      message,
      data: { [key]: result.rows },
      meta: {
        ...result.meta,
        summary: buildSummary(summaryResult.rows, key)
      }
    });
  };
}

module.exports = {
  commissions: report(reports.commissions, 'commissions', 'Commissions report fetched'),
  currentStock: report(reports.currentStock, 'current_stock', 'Current stock report fetched'),
  customerBalances: report(reports.customerBalances, 'customer_balances', 'Customer balances report fetched'),
  debts: report(reports.debts, 'debts', 'Debts report fetched'),
  dispatchSummary: report(reports.dispatchSummary, 'dispatch_summary', 'Dispatch summary report fetched'),
  gifts: report(reports.gifts, 'gifts', 'Gift COGS report fetched'),
  invoices: report(reports.invoices, 'invoices', 'Invoices report fetched'),
  normalStock: report(reports.normalStock, 'normal_stock', 'Normal stock report fetched'),
  packagingOperations: report(reports.packagingOperations, 'packaging_operations', 'Packaging operations report fetched'),
  packagingShortages: report(reports.packagingShortages, 'packaging_shortages', 'Packaging shortages report fetched'),
  packagingStock: report(reports.packagingStock, 'packaging_stock', 'Packaging stock report fetched'),
  posOrders: report(reports.posOrders, 'pos_orders', 'POS orders report fetched'),
  profitLoss: report(reports.profitLoss, 'profit_loss', 'Profit/loss report fetched'),
  purchases: report(reports.purchases, 'purchases', 'Purchases report fetched'),
  readyStock: report(reports.readyStock, 'ready_stock', 'Ready stock report fetched'),
  salesmanPerformance: report(reports.salesmanPerformance, 'salesman_performance', 'Salesman performance report fetched'),
  salesmanTargetProgress: report(reports.salesmanTargetProgress, 'salesman_target_progress', 'Salesman target progress report fetched'),
  sales: report(reports.sales, 'sales', 'Sales report fetched'),
  stockMovements: report(reports.stockMovements, 'stock_movements', 'Stock movements report fetched'),
  _private: {
    buildSummary,
    SUMMARY_METRICS
  }
};
