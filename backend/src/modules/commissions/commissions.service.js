const ApiError = require('../../utils/ApiError');
const { decimal, percent, toMoney } = require('../../utils/money');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const accountingModel = require('../accounting/accounting.model');
const model = require('./commissions.model');

function calculateAmounts(targetAmountValue, salesAmountValue, rule) {
  const targetAmount = decimal(targetAmountValue);
  const salesAmount = decimal(salesAmountValue);
  let below = decimal(0);
  let target = decimal(0);
  let above = decimal(0);

  if (salesAmount.lt(targetAmount)) {
    below = salesAmount.mul(percent(rule.below_target_rate));
  } else if (salesAmount.eq(targetAmount)) {
    target = targetAmount.mul(percent(rule.at_target_rate));
  } else {
    target = targetAmount.mul(percent(rule.at_target_rate));
    above = salesAmount.minus(targetAmount).mul(percent(rule.above_target_extra_rate));
  }

  return {
    below_target_commission: toMoney(below),
    target_commission: toMoney(target),
    above_target_commission: toMoney(above),
    total_commission: toMoney(below.plus(target).plus(above))
  };
}

async function calculateForSalesmanTarget(salesmanTargetId, options = {}, actor = {}) {
  const target = await model.getSalesmanTarget(salesmanTargetId);
  assertRowInScope(target, actor, 'Salesman target not found');

  const existingCalculation = await model.findActiveCalculationBySalesmanTarget(target.id);
  if (existingCalculation) {
    throw ApiError.conflict('Commission calculation already exists for this salesman target');
  }

  const rule = options.commission_rule_id
    ? await model.findRuleById(options.commission_rule_id)
    : await model.getActiveRuleForPeriod(target.period_start, target.period_end, target.store_id, target.target_period);

  if (!rule) throw ApiError.conflict('No active commission rule applies to this period');
  assertSameStore(rule, target.store_id, 'commission_rule_id', 'Commission rule does not belong to this store');
  if (rule.target_period !== target.target_period) {
    throw ApiError.conflict('Commission rule period must match the salesman target period');
  }

  const salesAmount = await model.getSalesAmountForTarget(target);
  const amounts = calculateAmounts(target.target_amount, salesAmount, rule);

  return model.createCalculation({
    store_id: target.store_id,
    commission_rule_id: rule.id,
    salesman_target_id: target.id,
    salesman_id: target.salesman_id,
    sublocation_id: target.sublocation_id,
    period_start: target.period_start,
    period_end: target.period_end,
    target_amount: target.target_amount,
    sales_amount: toMoney(salesAmount),
    ...amounts,
    status: 'draft'
  });
}

async function approveCommission(id, userId, actor = {}) {
  const calculation = await model.findCalculationById(id);
  assertRowInScope(calculation, actor, 'Commission calculation not found');
  if (calculation.status !== 'draft') throw ApiError.conflict('Only draft commissions can be approved');
  return model.approveCalculation(id, userId);
}

async function payCommission(id, data, userId, actor = {}) {
  let paymentId;
  await withTransaction(async (connection) => {
    const calculation = await model.lockCalculationById(connection, id);
    assertRowInScope(calculation, actor, 'Commission calculation not found');
    if (calculation.status !== 'approved') throw ApiError.conflict('Only approved commissions can be paid');
    const paymentAmount = data.amount || calculation.total_commission;
    if (!decimal(paymentAmount).eq(calculation.total_commission)) {
      throw ApiError.conflict('Commission payment amount must equal the approved commission total');
    }
    const cashAccount = await accountingModel.findCashAccountById(data.cash_account_id);
    if (!cashAccount) {
      throw ApiError.badRequest('Validation failed', [
        {
          field: 'cash_account_id',
          message: 'Cash account not found'
        }
      ]);
    }
    assertSameStore(cashAccount, calculation.store_id, 'cash_account_id', 'Cash account does not belong to this store');
    if (cashAccount.status !== 'active') {
      throw ApiError.badRequest('Validation failed', [
        {
          field: 'cash_account_id',
          message: 'Cash account must be active'
        }
      ]);
    }

    paymentId = await model.createPayment(connection, {
      store_id: calculation.store_id,
      commission_calculation_id: id,
      salesman_id: calculation.salesman_id,
      payment_date: data.payment_date,
      amount: paymentAmount,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      paid_by: userId,
      notes: data.notes
    });

    await accountingModel.createFinancialTransaction(connection, {
      store_id: calculation.store_id,
      cash_account_id: data.cash_account_id,
      transaction_type: 'commission_payment',
      direction: 'out',
      amount: paymentAmount,
      reference_type: 'commission_payment',
      reference_id: paymentId,
      description: data.notes,
      created_by: userId
    });
  });

  return { commission_payment_id: paymentId };
}

module.exports = {
  approveCommission,
  calculateAmounts,
  calculateForSalesmanTarget,
  createRule: (data, userId, actor = {}) => model.createRule({ ...scopedData(data, actor), created_by: userId }),
  deleteRule: async (id, actor = {}) => {
    const rule = await model.findRuleById(id);
    assertRowInScope(rule, actor, 'Commission rule not found');
    await model.deleteRule(id);
  },
  getCommission: async (id, actor = {}) => {
    const row = await model.findCalculationById(id);
    return assertRowInScope(row, actor, 'Commission calculation not found');
  },
  listCommissions: (query, actor = {}) => model.listCalculations(scopedQuery(query, actor)),
  listRules: (query, actor = {}) => model.listRules(scopedQuery(query, actor)),
  payCommission,
  updateRule: async (id, data, actor = {}) => {
    const rule = await model.findRuleById(id);
    assertRowInScope(rule, actor, 'Commission rule not found');
    const { store_id, ...updates } = data;
    return model.updateRule(id, updates);
  }
};
