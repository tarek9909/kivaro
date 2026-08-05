const ApiError = require('../../utils/ApiError');
const { decimal, percent, toMoney } = require('../../utils/money');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const accountingModel = require('../accounting/accounting.model');
const auditService = require('../../services/audit.service');
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

function currentMonth() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' }).slice(0, 7) + '-01';
}

function nextMonth(periodMonth) {
  const date = new Date(`${periodMonth}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function calendarProration(salesman, periodMonth) {
  const [year, month] = periodMonth.slice(0, 7).split('-').map(Number);
  const periodDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const periodStart = `${periodMonth.slice(0, 7)}-01`;
  const periodEnd = `${periodMonth.slice(0, 7)}-${String(periodDays).padStart(2, '0')}`;
  const joinedAt = salesman.joined_at ? String(salesman.joined_at).slice(0, 10) : null;
  const employmentEndDate = salesman.employment_end_date ? String(salesman.employment_end_date).slice(0, 10) : null;
  const employmentStart = joinedAt && joinedAt > periodStart ? joinedAt : periodStart;
  const employmentEnd = employmentEndDate && employmentEndDate < periodEnd
    ? employmentEndDate
    : periodEnd;
  const days = employmentStart > employmentEnd
    ? 0
    : Math.floor((Date.parse(`${employmentEnd}T00:00:00Z`) - Date.parse(`${employmentStart}T00:00:00Z`)) / 86400000) + 1;
  return { days, periodDays, policy: 'calendar_days' };
}

async function calculateForSalesmanTarget(salesmanTargetId, actor = {}, options = {}) {
  const target = await model.getSalesmanTarget(salesmanTargetId, options.connection, options.lock);
  assertRowInScope(target, actor, 'Salesman target not found');
  if (options.requireActive && target.status !== 'active') {
    throw ApiError.conflict('Only active salesman targets can be finalized');
  }

  const existingCalculation = await model.findActiveCalculationBySalesmanTarget(target.id, options.connection);
  if (existingCalculation) {
    throw ApiError.conflict('Commission calculation already exists for this salesman target');
  }

  const rule = target.snapshot_commission_rule_id
    ? {
      id: target.snapshot_commission_rule_id,
      name: target.snapshot_rule_name,
      below_target_rate: target.snapshot_below_target_rate,
      at_target_rate: target.snapshot_at_target_rate,
      above_target_extra_rate: target.snapshot_above_target_extra_rate
    }
    : null;

  if (!rule) {
    throw ApiError.conflict('This target has no captured commission rule. Assign a rule before creating a new target.');
  }

  const salesAmount = await model.getCollectedAmountForTarget(target, options.connection);
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
    status: options.autoApprove ? 'approved' : 'draft',
    approved_by: options.autoApprove ? null : undefined,
    approved_at: options.autoApprove ? new Date() : undefined
  }, options.connection);
}

async function closeTargetHierarchy(connection, salesmanTargetId) {
  await connection.execute("UPDATE salesman_targets SET status = 'closed' WHERE id = ? AND status = 'active'", [salesmanTargetId]);
  const [parents] = await connection.execute(
    `SELECT slt.id AS sublocation_target_id, slt.location_target_id
     FROM salesman_targets st JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
     WHERE st.id = ?`, [salesmanTargetId]
  );
  const parent = parents[0];
  if (!parent) return;
  await connection.execute(
    `UPDATE sublocation_targets slt SET status = 'closed'
     WHERE slt.id = ? AND NOT EXISTS (
       SELECT 1 FROM salesman_targets st WHERE st.sublocation_target_id = slt.id AND st.status = 'active'
     )`, [parent.sublocation_target_id]
  );
  await connection.execute(
    `UPDATE location_targets lt SET status = 'closed'
     WHERE lt.id = ? AND NOT EXISTS (
       SELECT 1 FROM sublocation_targets slt WHERE slt.location_target_id = lt.id AND slt.status = 'active'
     )`, [parent.location_target_id]
  );
}

async function notifyCommissionManagers(connection, storeId, commissionId) {
  const [managers] = await connection.execute(
    `SELECT DISTINCT u.id FROM users u JOIN roles r ON r.id = u.role_id
     JOIN role_permissions rp ON rp.role_id = r.id JOIN permissions p ON p.id = rp.permission_id
     WHERE u.store_id = ? AND u.status = 'active' AND p.permission_key = 'commissions.manage'`, [storeId]
  );
  for (const manager of managers) {
    await connection.execute(
      `INSERT INTO notifications (store_id, user_id, title, message, notification_type, reference_type, reference_id)
       VALUES (?, ?, 'Commission ready', 'A period-close commission is approved and ready for payment.', 'success', 'commission', ?)`,
      [storeId, manager.id, commissionId]
    );
  }
}

async function processDueCommissions(businessDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' })) {
  const dueTargets = await model.listDueSalesmanTargets(businessDate);
  const processed = [];
  const failures = [];
  for (const due of dueTargets) {
    try {
      const outcome = await withTransaction(async (connection) => {
      const existing = await model.findActiveCalculationBySalesmanTarget(due.id, connection);
      if (existing) {
        await closeTargetHierarchy(connection, due.id);
        return { existing: true, commissionId: existing.id };
      }
      const commission = await calculateForSalesmanTarget(due.id, { store_id: due.store_id }, {
        autoApprove: true, connection, lock: true, requireActive: true
      });
        await closeTargetHierarchy(connection, due.id);
        await connection.execute(
          `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description)
           SELECT lt.store_id, lt.id, st.id, 'commission_finalized', 'Automatic collected-cash commission approved'
           FROM salesman_targets st JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
           JOIN location_targets lt ON lt.id = slt.location_target_id WHERE st.id = ?`, [due.id]
        );
        await notifyCommissionManagers(connection, due.store_id, commission.id);
        await auditService.logAudit(connection, {
          storeId: due.store_id, module: 'commissions', action: 'automatic_period_close', tableName: 'commission_calculations',
          recordId: commission.id, newValues: { salesman_target_id: due.id, business_date: businessDate },
          description: 'Automatic period-close commission calculation'
        });
      return { existing: false, commissionId: commission.id };
      });
      if (!outcome.existing) processed.push(outcome.commissionId);
    } catch (error) {
      // One malformed historical target must not prevent every other period
      // from closing.  Leave it open for correction and make the exception
      // visible in both target history and scheduler output.
      failures.push({ salesman_target_id: due.id, message: error.message });
      await withTransaction(async (connection) => {
        await connection.execute(
          `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description)
           SELECT lt.store_id, lt.id, st.id, 'commission_finalization_failed', ?
           FROM salesman_targets st
           JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
           JOIN location_targets lt ON lt.id = slt.location_target_id
           WHERE st.id = ?`,
          [`Automatic commission finalization failed: ${error.message}`, due.id]
        );
      });
    }
  }
  // A target may deliberately have an unassigned sublocation.  It has no
  // salesman target to finalise, but its expired allocation must not keep the
  // whole location target open forever.
  await withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE sublocation_targets slt
       JOIN location_targets lt ON lt.id = slt.location_target_id
       SET slt.status = 'closed'
       WHERE lt.period_end < ? AND slt.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM salesman_targets st
           WHERE st.sublocation_target_id = slt.id AND st.status = 'active'
         )`,
      [businessDate]
    );
    await connection.execute(
      `UPDATE location_targets lt
       SET lt.status = 'closed'
       WHERE lt.period_end < ? AND lt.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM sublocation_targets slt
           WHERE slt.location_target_id = lt.id AND slt.status = 'active'
         )`,
      [businessDate]
    );
  });
  return {
    processed_count: processed.length,
    commission_ids: processed,
    failed_count: failures.length,
    failures
  };
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
    if (cashAccount.status !== 'active' || !['outgoing', 'both'].includes(cashAccount.cash_flow_permission || 'both')) {
      throw ApiError.badRequest('Validation failed', [
        {
          field: 'cash_account_id',
          message: 'Cash account must be active and allow outgoing payments'
        }
      ]);
    }

    paymentId = await model.createPayment(connection, {
      store_id: calculation.store_id,
      commission_calculation_id: id,
      salesman_id: calculation.salesman_id,
      cash_account_id: data.cash_account_id,
      transaction_date: data.payment_date,
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
      transaction_date: data.payment_date,
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

async function listMonthlyPayroll(query = {}, actor = {}) {
  const scoped = scopedQuery(query, actor);
  const periodMonth = scoped.period_month || currentMonth();
  const rows = await model.listMonthlyPayroll({
    store_id: scoped.store_id,
    period_month: periodMonth,
    next_period_month: nextMonth(periodMonth)
  });
  return {
    period_month: periodMonth,
    payroll: rows.map((row) => {
      const proration = calendarProration(row, periodMonth);
      const proratedSalary = decimal(row.salary_eligible ? row.base_salary || 0 : 0)
        .mul(proration.days).div(proration.periodDays || 1);
      const salaryBalance = proratedSalary.minus(decimal(row.base_salary_paid || 0));
      const salaryDue = salaryBalance.isNegative() ? decimal(0) : salaryBalance;
      const commissionDue = decimal(row.approved_commission || 0);
      return {
        ...row,
        salary_proration_days: proration.days,
        salary_proration_period_days: proration.periodDays,
        salary_proration_policy: proration.policy,
        prorated_base_salary: toMoney(proratedSalary),
        salary_due: toMoney(salaryDue),
        commission_due: toMoney(commissionDue),
        total_due: toMoney(salaryDue.plus(commissionDue)),
        total_paid: toMoney(row.total_paid_amount || 0),
        commission_paid: toMoney(row.commission_paid || 0),
        salary_paid: toMoney(row.base_salary_paid || 0),
        payment_date: row.last_payment_date || null
      };
    })
  };
}

async function payMonthlyPayroll(salesmanId, data, userId, actor = {}) {
  const scoped = scopedData({}, actor);
  if (data.period_month > currentMonth()) {
    throw ApiError.badRequest('Validation failed', [{ field: 'period_month', message: 'Future payroll months cannot be paid' }]);
  }
  const nextPeriodMonth = nextMonth(data.period_month);
  let payrollPaymentId;
  await withTransaction(async (connection) => {
    const salesman = await model.lockSalesmanForPayroll(connection, salesmanId, scoped.store_id);
    if (!salesman) throw ApiError.notFound('Salesman not found');
    const existing = await model.findPayrollPaymentForMonth(connection, salesmanId, data.period_month);

    const cashAccount = await accountingModel.findCashAccountById(data.cash_account_id);
    if (!cashAccount) throw ApiError.badRequest('Validation failed', [{ field: 'cash_account_id', message: 'Cash account not found' }]);
    assertSameStore(cashAccount, scoped.store_id, 'cash_account_id', 'Cash account does not belong to this store');
    if (cashAccount.status !== 'active' || !['outgoing', 'both'].includes(cashAccount.cash_flow_permission || 'both')) {
      throw ApiError.badRequest('Validation failed', [{ field: 'cash_account_id', message: 'Cash account must be active and allow outgoing payments' }]);
    }

    const commissions = await model.lockApprovedCommissionsForMonth(
      connection, salesmanId, scoped.store_id, data.period_month, nextPeriodMonth
    );
    const commissionAmount = commissions.reduce((sum, commission) => sum.plus(commission.total_commission), decimal(0));
    const scheduledSalary = decimal(await model.getSalaryForPeriod(
      connection, salesman.id, scoped.store_id, data.period_month, salesman.base_salary || 0
    ));
    const proration = calendarProration(salesman, data.period_month);
    const salaryAmount = existing || !proration.days
      ? decimal(0)
      : scheduledSalary.mul(proration.days).div(proration.periodDays);
    const totalAmount = salaryAmount.plus(commissionAmount);
    if (totalAmount.lte(0)) {
      throw ApiError.conflict(existing
        ? 'There are no newly approved commissions to add to this payroll month'
        : 'There is no base salary or approved commission to pay for this month');
    }

    const payoutKind = existing ? 'commission_top_up' : 'regular';
    const payoutSequence = await model.nextPayrollPayoutSequence(connection, salesmanId, data.period_month);

    payrollPaymentId = await model.createPayrollPayment(connection, {
      store_id: scoped.store_id,
      salesman_id: salesman.id,
      period_month: data.period_month,
      payout_sequence: payoutSequence,
      payout_kind: payoutKind,
      base_salary_amount: toMoney(salaryAmount),
      salary_proration_days: existing ? 0 : proration.days,
      salary_proration_period_days: existing ? 0 : proration.periodDays,
      salary_proration_policy: proration.policy,
      commission_amount: toMoney(commissionAmount),
      total_amount: toMoney(totalAmount),
      cash_account_id: data.cash_account_id,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      paid_by: userId,
      notes: data.notes
    });
    for (const commission of commissions) {
      await model.createPayment(connection, {
        store_id: scoped.store_id,
        commission_calculation_id: commission.id,
        payroll_payment_id: payrollPaymentId,
        salesman_id: salesman.id,
        cash_account_id: data.cash_account_id,
        payment_date: data.payment_date,
        amount: commission.total_commission,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        paid_by: userId,
        notes: `Included in monthly payroll #${payrollPaymentId}${data.notes ? `: ${data.notes}` : ''}`
      });
    }
    await accountingModel.createFinancialTransaction(connection, {
      store_id: scoped.store_id,
      cash_account_id: data.cash_account_id,
      transaction_date: data.payment_date,
      transaction_type: 'salesman_payroll_payment',
      direction: 'out',
      amount: toMoney(totalAmount),
      reference_type: 'salesman_payroll_payment',
      reference_id: payrollPaymentId,
      description: `Monthly payroll for ${salesman.full_name} (${data.period_month.slice(0, 7)})`,
      created_by: userId
    });
    await auditService.logAudit(connection, {
      storeId: scoped.store_id, userId, module: 'commissions', action: 'monthly_payroll_paid',
      tableName: 'salesman_payroll_payments', recordId: payrollPaymentId,
      newValues: { salesman_id: salesman.id, period_month: data.period_month, payout_kind: payoutKind, base_salary: toMoney(salaryAmount), commission: toMoney(commissionAmount), total: toMoney(totalAmount) },
      description: payoutKind === 'regular' ? 'Monthly salesman salary and commission payroll paid' : 'Approved commissions added to an already-paid monthly payroll'
    });
  });
  return { id: payrollPaymentId };
}

module.exports = {
  approveCommission,
  calculateAmounts,
  calculateForSalesmanTarget,
  processDueCommissions,
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
  listMonthlyPayroll,
  listRules: (query, actor = {}) => model.listRules(scopedQuery(query, actor)),
  payCommission,
  payMonthlyPayroll,
  updateRule: async (id, data, actor = {}) => {
    const rule = await model.findRuleById(id);
    assertRowInScope(rule, actor, 'Commission rule not found');
    const { store_id, ...updates } = data;
    return model.updateRule(id, updates);
  }
};

module.exports._private = { calendarProration };
