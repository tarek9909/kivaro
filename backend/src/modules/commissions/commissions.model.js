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

async function findRuleById(id) {
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

async function getSalesmanTarget(id) {
  const rows = await query(
    `SELECT st.id, st.sublocation_target_id, st.salesman_id, st.target_amount,
      st.store_id, st.achieved_sales_amount, st.status, subt.sublocation_id,
      lt.target_period, lt.period_start, lt.period_end
     FROM salesman_targets st
     JOIN sublocation_targets subt ON subt.id = st.sublocation_target_id
     JOIN location_targets lt ON lt.id = subt.location_target_id
     WHERE st.id = ?
     LIMIT 1`,
    [id]
  );

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

async function createCalculation(data) {
  return insertRecord('commission_calculations', data);
}

async function findActiveCalculationBySalesmanTarget(salesmanTargetId) {
  const rows = await query(
    `SELECT *
     FROM commission_calculations
     WHERE salesman_target_id = ?
       AND status <> 'cancelled'
     ORDER BY id DESC
     LIMIT 1`,
    [salesmanTargetId]
  );

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
      store_id, commission_calculation_id, salesman_id, payment_date, amount,
      payment_method, reference_number, paid_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.commission_calculation_id,
      data.salesman_id,
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
  getSalesAmountForTarget,
  getSalesmanTarget,
  listCalculations,
  listRules,
  updateRule
};
