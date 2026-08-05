const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, nullable, updateRecord } = require('../../utils/crud');

async function listRules(input) {
  return listRecords({
    select: 'SELECT id, store_id, name, target_period, below_target_rate, at_target_rate, above_target_extra_rate, applies_from, applies_to, status, created_by, created_at, updated_at',
    from: 'commission_rules',
    filters: [
      { key: 'status', column: 'status' },
      { key: 'store_id', column: 'store_id' },
      { key: 'target_period', column: 'target_period' },
      { key: 'search', type: 'search', fields: ['name'] }
    ],
    orderBy: 'ORDER BY applies_from DESC, id DESC'
  }, input);
}

async function createRule(data) {
  return insertRecord('commission_rules', data);
}

async function updateRule(id, data) {
  return updateRecord('commission_rules', id, data);
}

async function deleteRule(id) {
  const result = await query(
    `UPDATE commission_rules
     SET status = 'inactive'
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
}

async function findRuleById(id, connection = null) {
  if (connection) {
    const [rows] = await connection.execute('SELECT * FROM commission_rules WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }
  return findById('commission_rules', id);
}

async function getActiveRuleForPeriod(periodStart, periodEnd = periodStart, storeId = null, targetPeriod = null) {
  const conditions = [
    "status = 'active'",
    'applies_from <= ?',
    '(applies_to IS NULL OR applies_to >= ?)'
  ];
  const params = [periodEnd, periodStart];
  if (storeId) {
    conditions.push('store_id = ?');
    params.push(storeId);
  }
  if (targetPeriod) {
    conditions.push('target_period = ?');
    params.push(targetPeriod);
  }

  const rows = await query(
    `SELECT *
     FROM commission_rules
     WHERE ${conditions.join(' AND ')}
     ORDER BY applies_from DESC, id DESC
     LIMIT 1`,
    params
  );

  return rows[0] || null;
}

async function getSalesmanTarget(id, connection = null, lock = false) {
  const sql = `SELECT st.id, st.sublocation_target_id, st.salesman_id, st.target_amount,
      st.store_id, st.achieved_sales_amount, st.status, subt.sublocation_id,
      lt.target_period, lt.period_start, lt.period_end,
      snapshot.commission_rule_id AS snapshot_commission_rule_id,
      snapshot.rule_name AS snapshot_rule_name,
      snapshot.below_target_rate AS snapshot_below_target_rate,
      snapshot.at_target_rate AS snapshot_at_target_rate,
      snapshot.above_target_extra_rate AS snapshot_above_target_extra_rate
     FROM salesman_targets st
     JOIN salesmen s ON s.id = st.salesman_id
     JOIN sublocation_targets subt ON subt.id = st.sublocation_target_id
     JOIN location_targets lt ON lt.id = subt.location_target_id
     LEFT JOIN salesman_target_commission_snapshots snapshot ON snapshot.salesman_target_id = st.id
     WHERE st.id = ?
     LIMIT 1`;
  const statement = lock ? `${sql} FOR UPDATE` : sql;
  const rows = connection
    ? (await connection.execute(statement, [id]))[0]
    : await query(statement, [id]);

  return rows[0] || null;
}

async function getSalesAmountForTarget(target) {
  const rows = await query(
    `SELECT COALESCE(SUM(
        CASE WHEN di.quantity > 0
          THEN di.line_total - (di.line_total * di.returned_quantity / di.quantity)
          ELSE di.line_total
        END
      ), 0) AS sales_amount
     FROM dispatch_items di
     JOIN dispatch_customers dc ON dc.id = di.dispatch_customer_id
     JOIN dispatch_requests dr ON dr.id = dc.dispatch_request_id
     WHERE dr.salesman_id = ?
       AND dc.sublocation_id = ?
       AND dr.store_id = ?
       AND dr.status = 'completed'
       AND dr.request_date BETWEEN ? AND ?`,
    [target.salesman_id, target.sublocation_id, target.store_id, target.period_start, target.period_end]
  );

  return Number(rows[0].sales_amount);
}

async function getCollectedAmountForTarget(target, connection = null) {
  const sql =
    `SELECT COALESCE(SUM(amount), 0) AS collected_amount
     FROM target_collection_credits
     WHERE salesman_target_id = ?`;
  const rows = connection
    ? (await connection.execute(sql, [target.id]))[0]
    : await query(sql, [target.id]);
  return Number(rows[0]?.collected_amount || 0);
}

async function listDueSalesmanTargets(businessDate) {
  return query(
    `SELECT st.id, st.store_id
     FROM salesman_targets st
     JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
     JOIN location_targets lt ON lt.id = slt.location_target_id
     WHERE st.status = 'active' AND slt.status = 'active' AND lt.status = 'active'
       AND lt.period_end < ?
       AND NOT EXISTS (
         SELECT 1 FROM target_events te
         WHERE te.salesman_target_id = st.id AND te.event_type = 'salesman_deactivated'
       )
     ORDER BY lt.period_end ASC, st.id ASC`,
    [businessDate]
  );
}

async function createCalculation(data, connection = null) {
  if (connection) {
    const entries = Object.entries(data).filter(([, value]) => value !== undefined);
    const columns = entries.map(([key]) => key);
    const [result] = await connection.execute(
      `INSERT INTO commission_calculations (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      entries.map(([, value]) => value)
    );
    const [rows] = await connection.execute('SELECT * FROM commission_calculations WHERE id = ? LIMIT 1', [result.insertId]);
    return rows[0];
  }
  return insertRecord('commission_calculations', data);
}

async function findActiveCalculationBySalesmanTarget(salesmanTargetId, connection = null) {
  const sql =
    `SELECT *
     FROM commission_calculations
     WHERE salesman_target_id = ?
       AND status <> 'cancelled'
     ORDER BY id DESC
     LIMIT 1`;
  const rows = connection
    ? (await connection.execute(sql, [salesmanTargetId]))[0]
    : await query(sql, [salesmanTargetId]);

  return rows[0] || null;
}

async function listCalculations(input) {
  return listRecords({
    select: `SELECT cc.id, cc.commission_rule_id, cr.name AS commission_rule_name,
      cc.salesman_target_id, cc.store_id, cc.salesman_id, s.full_name AS salesman_name,
      cc.sublocation_id, sl.name AS sublocation_name, cc.period_start, cc.period_end,
      cc.target_amount, cc.sales_amount, cc.below_target_commission,
      cc.target_commission, cc.above_target_commission, cc.total_commission,
      cc.status, cc.approved_by, cc.approved_at, cc.paid_at, cc.created_at`,
    from: 'commission_calculations cc',
    joins: `
      JOIN commission_rules cr ON cr.id = cc.commission_rule_id
      JOIN salesmen s ON s.id = cc.salesman_id
      JOIN sublocations sl ON sl.id = cc.sublocation_id`,
    filters: [
      { key: 'salesman_id', column: 'cc.salesman_id' },
      { key: 'store_id', column: 'cc.store_id' },
      { key: 'sublocation_id', column: 'cc.sublocation_id' },
      { key: 'status', column: 'cc.status' },
      { key: 'date_from', column: 'cc.period_start', operator: 'date_gte' },
      { key: 'date_to', column: 'cc.period_end', operator: 'date_lte' }
    ],
    orderBy: 'ORDER BY cc.period_start DESC, cc.id DESC'
  }, input);
}

async function findCalculationById(id) {
  return findById('commission_calculations', id);
}

async function lockCalculationById(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM commission_calculations
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function approveCalculation(id, userId) {
  await query(
    `UPDATE commission_calculations
     SET status = 'approved', approved_by = ?, approved_at = NOW()
     WHERE id = ? AND status = 'draft'`,
    [userId, id]
  );

  return findCalculationById(id);
}

async function createPayment(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO commission_payments (
      store_id, commission_calculation_id, payroll_payment_id, salesman_id, cash_account_id, payment_date, amount,
      payment_method, reference_number, paid_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.commission_calculation_id,
      nullable(data.payroll_payment_id),
      data.salesman_id,
      nullable(data.cash_account_id),
      data.payment_date,
      data.amount,
      data.payment_method || 'cash',
      nullable(data.reference_number),
      nullable(data.paid_by),
      nullable(data.notes)
    ]
  );

  await connection.execute(
    `UPDATE commission_calculations
     SET status = 'paid', paid_at = NOW()
     WHERE id = ?`,
    [data.commission_calculation_id]
  );

  return result.insertId;
}

async function listMonthlyPayroll(input) {
  const rows = await query(
    `SELECT s.id AS salesman_id, s.full_name AS salesman_name, s.status AS salesman_status,
       s.joined_at, s.employment_end_date,
       CASE WHEN (s.joined_at IS NULL OR s.joined_at < ?)
          AND (s.employment_end_date IS NULL OR s.employment_end_date >= ?) THEN 1 ELSE 0 END AS salary_eligible,
       COALESCE((
         SELECT ssr.monthly_salary
         FROM salesman_salary_rates ssr
         WHERE ssr.salesman_id = s.id AND ssr.store_id = s.store_id
           AND ssr.effective_from <= ?
         ORDER BY ssr.effective_from DESC, ssr.id DESC LIMIT 1
       ), s.base_salary) AS base_salary,
       COALESCE(commissions.approved_commission, 0) AS approved_commission,
       COALESCE(commissions.paid_commission, 0) AS paid_commission,
       payroll.regular_payment_id AS payroll_payment_id, payroll.base_salary_paid,
       payroll.commission_paid, payroll.total_paid_amount, payroll.last_payment_date
     FROM salesmen s
     LEFT JOIN (
       SELECT salesman_id,
         SUM(CASE WHEN status = 'approved' THEN total_commission ELSE 0 END) AS approved_commission,
         SUM(CASE WHEN status = 'paid' THEN total_commission ELSE 0 END) AS paid_commission
       FROM commission_calculations
       WHERE store_id = ? AND period_end >= ? AND period_end < ?
       GROUP BY salesman_id
     ) commissions ON commissions.salesman_id = s.id
     LEFT JOIN (
       SELECT salesman_id,
         MAX(CASE WHEN payout_kind = 'regular' THEN id END) AS regular_payment_id,
         COALESCE(SUM(base_salary_amount), 0) AS base_salary_paid,
         COALESCE(SUM(commission_amount), 0) AS commission_paid,
         COALESCE(SUM(total_amount), 0) AS total_paid_amount,
         MAX(payment_date) AS last_payment_date
       FROM salesman_payroll_payments
       WHERE store_id = ? AND period_month = ?
       GROUP BY salesman_id
     ) payroll ON payroll.salesman_id = s.id
     WHERE s.store_id = ?
     ORDER BY s.full_name ASC, s.id ASC`,
    [input.next_period_month, input.period_month, input.period_month, input.store_id, input.period_month, input.store_id, input.period_month, input.next_period_month, input.store_id]
  );
  return rows;
}

async function lockSalesmanForPayroll(connection, salesmanId, storeId) {
  const [rows] = await connection.execute(
    `SELECT id, store_id, full_name, base_salary, status, joined_at, employment_end_date
     FROM salesmen WHERE id = ? AND store_id = ? LIMIT 1 FOR UPDATE`,
    [salesmanId, storeId]
  );
  return rows[0] || null;
}

async function getSalaryForPeriod(connection, salesmanId, storeId, periodMonth, fallbackSalary) {
  const [rows] = await connection.execute(
    `SELECT monthly_salary
     FROM salesman_salary_rates
     WHERE salesman_id = ? AND store_id = ? AND effective_from <= ?
     ORDER BY effective_from DESC, id DESC LIMIT 1`,
    [salesmanId, storeId, periodMonth]
  );
  return rows[0]?.monthly_salary ?? fallbackSalary;
}

async function lockApprovedCommissionsForMonth(connection, salesmanId, storeId, periodMonth, nextPeriodMonth) {
  const [rows] = await connection.execute(
    `SELECT id, total_commission
     FROM commission_calculations
     WHERE salesman_id = ? AND store_id = ? AND status = 'approved'
       AND period_end >= ? AND period_end < ?
     ORDER BY id ASC FOR UPDATE`,
    [salesmanId, storeId, periodMonth, nextPeriodMonth]
  );
  return rows;
}

async function findPayrollPaymentForMonth(connection, salesmanId, periodMonth, payoutKind = 'regular') {
  const [rows] = await connection.execute(
    `SELECT id FROM salesman_payroll_payments
     WHERE salesman_id = ? AND period_month = ? AND payout_kind = ? LIMIT 1 FOR UPDATE`,
    [salesmanId, periodMonth, payoutKind]
  );
  return rows[0] || null;
}

async function nextPayrollPayoutSequence(connection, salesmanId, periodMonth) {
  const [rows] = await connection.execute(
    `SELECT COALESCE(MAX(payout_sequence), 0) + 1 AS payout_sequence
     FROM salesman_payroll_payments
     WHERE salesman_id = ? AND period_month = ? FOR UPDATE`,
    [salesmanId, periodMonth]
  );
  return Number(rows[0]?.payout_sequence || 1);
}

async function createPayrollPayment(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO salesman_payroll_payments (
      store_id, salesman_id, period_month, payout_sequence, payout_kind, base_salary_amount, commission_amount,
      salary_proration_days, salary_proration_period_days, salary_proration_policy,
      total_amount, cash_account_id, payment_date, payment_method, reference_number, paid_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.store_id, data.salesman_id, data.period_month, data.payout_sequence, data.payout_kind,
      data.base_salary_amount, data.commission_amount, data.salary_proration_days || 0,
      data.salary_proration_period_days || 0, data.salary_proration_policy || 'calendar_days',
      data.total_amount, data.cash_account_id, data.payment_date, data.payment_method || 'cash',
      nullable(data.reference_number), nullable(data.paid_by), nullable(data.notes)]
  );
  return result.insertId;
}

module.exports = {
  approveCalculation,
  createCalculation,
  createPayment,
  findActiveCalculationBySalesmanTarget,
  createRule,
  deleteRule,
  findCalculationById,
  lockCalculationById,
  findRuleById,
  getActiveRuleForPeriod,
  getCollectedAmountForTarget,
  getSalesAmountForTarget,
  getSalesmanTarget,
  listDueSalesmanTargets,
  listCalculations,
  listMonthlyPayroll,
  listRules,
  lockApprovedCommissionsForMonth,
  lockSalesmanForPayroll,
  findPayrollPaymentForMonth,
  getSalaryForPeriod,
  nextPayrollPayoutSequence,
  createPayrollPayment,
  updateRule
};
