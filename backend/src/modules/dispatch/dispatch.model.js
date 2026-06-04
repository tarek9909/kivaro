const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, nullable, updateRecord } = require('../../utils/crud');

async function listDispatchRequests(input) {
  return listRecords({
    select: `SELECT dr.id, dr.dispatch_number, dr.salesman_id, s.full_name AS salesman_name,
      dr.warehouse_id, w.name AS warehouse_name, dr.request_date, dr.status, dr.store_id,
      dr.total_quantity, dr.subtotal_amount, dr.vat_amount, dr.total_amount, dr.total_collected, dr.total_debt,
      COALESCE(adjustments.debt_adjustment_amount, 0) AS debt_adjustment_amount,
      COALESCE(debts.outstanding_debt_amount, 0) AS outstanding_debt_amount,
      COALESCE(costs.total_cost, 0) AS total_cost,
      COALESCE(costs.returned_subtotal_amount, 0) AS returned_subtotal_amount,
      COALESCE(costs.returned_vat_amount, 0) AS returned_vat_amount,
      COALESCE(costs.returned_total_amount, 0) AS returned_total_amount,
      GREATEST(dr.subtotal_amount - COALESCE(costs.returned_subtotal_amount, 0), 0) AS net_subtotal_amount,
      GREATEST(dr.vat_amount - COALESCE(costs.returned_vat_amount, 0), 0) AS net_vat_amount,
      GREATEST(dr.total_amount - COALESCE(costs.returned_total_amount, 0), 0) AS net_total_amount,
      dr.approved_by, dr.approved_at, dr.dispatched_by, dr.dispatched_at,
      dr.completed_by, dr.completed_at, dr.notes, dr.created_by, dr.created_at, dr.updated_at`,
    from: 'dispatch_requests dr',
    joins: `
      JOIN salesmen s ON s.id = dr.salesman_id
      JOIN warehouses w ON w.id = dr.warehouse_id
      LEFT JOIN (
        SELECT dispatch_request_id,
          SUM(CASE WHEN quantity > 0 THEN (quantity - returned_quantity) * unit_cost ELSE quantity * unit_cost END) AS total_cost,
          SUM(CASE WHEN quantity > 0 THEN subtotal_amount * returned_quantity / quantity ELSE 0 END) AS returned_subtotal_amount,
          SUM(CASE WHEN quantity > 0 THEN vat_amount * returned_quantity / quantity ELSE 0 END) AS returned_vat_amount,
          SUM(CASE WHEN quantity > 0 THEN line_total * returned_quantity / quantity ELSE 0 END) AS returned_total_amount
        FROM dispatch_items
        GROUP BY dispatch_request_id
      ) costs ON costs.dispatch_request_id = dr.id
      LEFT JOIN (
        SELECT dispatch_request_id, COALESCE(SUM(amount), 0) AS debt_adjustment_amount
        FROM customer_debt_adjustments
        GROUP BY dispatch_request_id
      ) adjustments ON adjustments.dispatch_request_id = dr.id
      LEFT JOIN (
        SELECT dispatch_request_id, COALESCE(SUM(remaining_amount), 0) AS outstanding_debt_amount
        FROM customer_debts
        WHERE status IN ('pending', 'partially_paid')
        GROUP BY dispatch_request_id
      ) debts ON debts.dispatch_request_id = dr.id`,
    filters: [
      { key: 'status', column: 'dr.status' },
      { key: 'store_id', column: 'dr.store_id' },
      { key: 'salesman_id', column: 'dr.salesman_id' },
      { key: 'warehouse_id', column: 'dr.warehouse_id' },
      { key: 'date_from', column: 'dr.request_date', operator: 'date_gte' },
      { key: 'date_to', column: 'dr.request_date', operator: 'date_lte' },
      { key: 'search', type: 'search', fields: ['dr.dispatch_number', 's.full_name'] }
    ],
    orderBy: 'ORDER BY dr.request_date DESC, dr.id DESC'
  }, input);
}

async function findDispatchRequestById(id) {
  const rows = await query(
    `SELECT dr.*,
       COALESCE(adjustments.debt_adjustment_amount, 0) AS debt_adjustment_amount,
       COALESCE(debts.outstanding_debt_amount, 0) AS outstanding_debt_amount
     FROM dispatch_requests dr
     LEFT JOIN (
       SELECT dispatch_request_id, COALESCE(SUM(amount), 0) AS debt_adjustment_amount
       FROM customer_debt_adjustments
       GROUP BY dispatch_request_id
     ) adjustments ON adjustments.dispatch_request_id = dr.id
     LEFT JOIN (
       SELECT dispatch_request_id, COALESCE(SUM(remaining_amount), 0) AS outstanding_debt_amount
       FROM customer_debts
       WHERE status IN ('pending', 'partially_paid')
       GROUP BY dispatch_request_id
     ) debts ON debts.dispatch_request_id = dr.id
     WHERE dr.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function lockDispatchRequest(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM dispatch_requests
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function getDispatchCustomers(dispatchId) {
  return query(
    `SELECT dc.id, dc.dispatch_request_id, dc.customer_id, c.name AS customer_name,
      dc.location_id, l.name AS location_name, dc.sublocation_id, sl.name AS sublocation_name, dc.store_id,
      dc.subtotal_amount, dc.vat_amount, dc.customer_total_amount, dc.collected_amount, dc.debt_amount,
      COALESCE(adjustments.debt_adjustment_amount, 0) AS debt_adjustment_amount,
      COALESCE(debts.outstanding_debt_amount, 0) AS outstanding_debt_amount,
      COALESCE(costs.total_cost, 0) AS total_cost,
      COALESCE(costs.returned_subtotal_amount, 0) AS returned_subtotal_amount,
      COALESCE(costs.returned_vat_amount, 0) AS returned_vat_amount,
      COALESCE(costs.returned_total_amount, 0) AS returned_total_amount,
      GREATEST(dc.subtotal_amount - COALESCE(costs.returned_subtotal_amount, 0), 0) AS net_subtotal_amount,
      GREATEST(dc.vat_amount - COALESCE(costs.returned_vat_amount, 0), 0) AS net_vat_amount,
      GREATEST(dc.customer_total_amount - COALESCE(costs.returned_total_amount, 0), 0) AS net_total_amount,
      dc.payment_status, dc.receipt_number, dc.notes, dc.created_at
     FROM dispatch_customers dc
     JOIN customers c ON c.id = dc.customer_id
     JOIN locations l ON l.id = dc.location_id
     JOIN sublocations sl ON sl.id = dc.sublocation_id
     LEFT JOIN (
       SELECT dispatch_customer_id,
         SUM(CASE WHEN quantity > 0 THEN (quantity - returned_quantity) * unit_cost ELSE quantity * unit_cost END) AS total_cost,
         SUM(CASE WHEN quantity > 0 THEN subtotal_amount * returned_quantity / quantity ELSE 0 END) AS returned_subtotal_amount,
         SUM(CASE WHEN quantity > 0 THEN vat_amount * returned_quantity / quantity ELSE 0 END) AS returned_vat_amount,
         SUM(CASE WHEN quantity > 0 THEN line_total * returned_quantity / quantity ELSE 0 END) AS returned_total_amount
       FROM dispatch_items
       GROUP BY dispatch_customer_id
     ) costs ON costs.dispatch_customer_id = dc.id
     LEFT JOIN (
       SELECT dispatch_customer_id, COALESCE(SUM(amount), 0) AS debt_adjustment_amount
       FROM customer_debt_adjustments
       GROUP BY dispatch_customer_id
     ) adjustments ON adjustments.dispatch_customer_id = dc.id
     LEFT JOIN (
       SELECT dispatch_customer_id, COALESCE(SUM(remaining_amount), 0) AS outstanding_debt_amount
       FROM customer_debts
       WHERE status IN ('pending', 'partially_paid')
       GROUP BY dispatch_customer_id
     ) debts ON debts.dispatch_customer_id = dc.id
     WHERE dc.dispatch_request_id = ?
     ORDER BY dc.id ASC`,
    [dispatchId]
  );
}

async function getDispatchItems(dispatchId) {
  return query(
    `SELECT di.id, di.dispatch_customer_id, di.dispatch_request_id, di.item_variant_id,
      di.packaging_assignment_id, pga.created_at AS packaging_assignment_created_at,
      pg.name AS packaging_group_name,
      iv.variant_name, iv.sku, i.name AS item_name, di.quantity, di.unit_price,
      di.unit_cost,
      CASE WHEN di.quantity > 0 THEN (di.quantity - di.returned_quantity) * di.unit_cost ELSE di.quantity * di.unit_cost END AS total_cost,
      di.subtotal_amount, di.vat_rate, di.vat_amount, di.line_total, di.returned_quantity,
      CASE WHEN di.quantity > 0 THEN di.subtotal_amount * di.returned_quantity / di.quantity ELSE 0 END AS returned_subtotal_amount,
      CASE WHEN di.quantity > 0 THEN di.vat_amount * di.returned_quantity / di.quantity ELSE 0 END AS returned_vat_amount,
      CASE WHEN di.quantity > 0 THEN di.line_total * di.returned_quantity / di.quantity ELSE 0 END AS returned_total_amount,
      CASE WHEN di.quantity > 0 THEN di.subtotal_amount - (di.subtotal_amount * di.returned_quantity / di.quantity) ELSE di.subtotal_amount END AS net_subtotal_amount,
      CASE WHEN di.quantity > 0 THEN di.vat_amount - (di.vat_amount * di.returned_quantity / di.quantity) ELSE di.vat_amount END AS net_vat_amount,
      CASE WHEN di.quantity > 0 THEN di.line_total - (di.line_total * di.returned_quantity / di.quantity) ELSE di.line_total END AS net_total_amount,
      di.created_at
     FROM dispatch_items di
     JOIN item_variants iv ON iv.id = di.item_variant_id
     JOIN items i ON i.id = iv.item_id
     LEFT JOIN packaging_group_assignments pga ON pga.id = di.packaging_assignment_id
     LEFT JOIN packaging_groups pg ON pg.id = pga.packaging_group_id
     WHERE di.dispatch_request_id = ?
     ORDER BY di.dispatch_customer_id ASC, di.id ASC`,
    [dispatchId]
  );
}

async function findDispatchCustomerById(id) {
  return findById('dispatch_customers', id);
}

async function findDispatchItemById(id) {
  return findById('dispatch_items', id);
}

async function lockDispatchItem(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM dispatch_items
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function createDispatchRequest(data) {
  return insertRecord('dispatch_requests', data);
}

async function updateDispatchRequest(id, data) {
  return updateRecord('dispatch_requests', id, data);
}

async function createDispatchCustomer(data) {
  return insertRecord('dispatch_customers', data);
}

async function createDispatchItem(data) {
  return insertRecord('dispatch_items', data);
}

async function updateDispatchItemUnitCost(connection, dispatchId, itemVariantId, unitCost) {
  await connection.execute(
    `UPDATE dispatch_items
     SET unit_cost = ?
     WHERE dispatch_request_id = ? AND item_variant_id = ?`,
    [unitCost, dispatchId, itemVariantId]
  );
}

async function recalculateDispatchTotals(dispatchId) {
  await query(
    `UPDATE dispatch_customers dc
     SET customer_total_amount = (
       SELECT COALESCE(SUM(line_total), 0)
       FROM dispatch_items di
       WHERE di.dispatch_customer_id = dc.id
     ),
     subtotal_amount = (
       SELECT COALESCE(SUM(subtotal_amount), 0)
       FROM dispatch_items di
       WHERE di.dispatch_customer_id = dc.id
     ),
     vat_amount = (
       SELECT COALESCE(SUM(vat_amount), 0)
       FROM dispatch_items di
       WHERE di.dispatch_customer_id = dc.id
     )
     WHERE dc.dispatch_request_id = ?`,
    [dispatchId]
  );

  await query(
    `UPDATE dispatch_requests dr
     SET
       total_quantity = (
         SELECT COALESCE(SUM(quantity), 0)
         FROM dispatch_items di
         WHERE di.dispatch_request_id = dr.id
       ),
       subtotal_amount = (
         SELECT COALESCE(SUM(subtotal_amount), 0)
         FROM dispatch_items di
         WHERE di.dispatch_request_id = dr.id
       ),
       vat_amount = (
         SELECT COALESCE(SUM(vat_amount), 0)
         FROM dispatch_items di
         WHERE di.dispatch_request_id = dr.id
       ),
       total_amount = (
         SELECT COALESCE(SUM(line_total), 0)
         FROM dispatch_items di
         WHERE di.dispatch_request_id = dr.id
       ),
       total_collected = (
         SELECT COALESCE(SUM(collected_amount), 0)
         FROM dispatch_customers dc
         WHERE dc.dispatch_request_id = dr.id
       ),
       total_debt = (
         SELECT COALESCE(SUM(debt_amount), 0)
         FROM dispatch_customers dc
         WHERE dc.dispatch_request_id = dr.id
       )
     WHERE dr.id = ?`,
    [dispatchId]
  );
}

async function aggregateDispatchItems(dispatchId, connection = null) {
  const executor = connection || { execute: (sql, params) => query(sql, params).then((rows) => [rows]) };
  const [rows] = await executor.execute(
    `SELECT item_variant_id, SUM(quantity - returned_quantity) AS quantity
     FROM dispatch_items
     WHERE dispatch_request_id = ?
       AND packaging_assignment_id IS NULL
     GROUP BY item_variant_id`,
    [dispatchId]
  );
  return rows;
}

async function aggregateDispatchAssignmentItems(dispatchId, connection = null) {
  const executor = connection || { execute: (sql, params) => query(sql, params).then((rows) => [rows]) };
  const [rows] = await executor.execute(
    `SELECT packaging_assignment_id, item_variant_id, SUM(quantity - returned_quantity) AS quantity
     FROM dispatch_items
     WHERE dispatch_request_id = ?
       AND packaging_assignment_id IS NOT NULL
     GROUP BY packaging_assignment_id, item_variant_id`,
    [dispatchId]
  );
  return rows;
}

async function updateDispatchCustomerSettlement(connection, id, data) {
  await connection.execute(
    `UPDATE dispatch_customers
     SET collected_amount = ?, debt_amount = ?, payment_status = ?
     WHERE id = ?`,
    [data.collected_amount, data.debt_amount, data.payment_status, id]
  );
}

async function updateDispatchCustomerReceiptNumber(connection, id, receiptNumber) {
  await connection.execute(
    `UPDATE dispatch_customers
     SET receipt_number = ?
     WHERE id = ?`,
    [receiptNumber, id]
  );
}

async function createDispatchReturn(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO dispatch_returns (
      store_id, dispatch_request_id, dispatch_item_id, item_variant_id, returned_quantity,
      reason, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.dispatch_request_id,
      data.dispatch_item_id,
      data.item_variant_id,
      data.returned_quantity,
      nullable(data.reason),
      nullable(data.created_by)
    ]
  );

  await connection.execute(
    `UPDATE dispatch_items
     SET returned_quantity = returned_quantity + ?
     WHERE id = ?`,
    [data.returned_quantity, data.dispatch_item_id]
  );

  return result.insertId;
}

async function createSettlement(data, connection = null) {
  if (!connection) {
    return insertRecord('dispatch_settlements', data);
  }

  const [result] = await connection.execute(
    `INSERT INTO dispatch_settlements (
      store_id, dispatch_request_id, settlement_number, settlement_date,
      total_expected, total_collected, total_debt, total_returned_value,
      status, settled_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nullable(data.store_id),
      data.dispatch_request_id,
      data.settlement_number,
      data.settlement_date,
      data.total_expected || 0,
      data.total_collected || 0,
      data.total_debt || 0,
      data.total_returned_value || 0,
      data.status || 'draft',
      nullable(data.settled_by),
      nullable(data.notes)
    ]
  );

  const [rows] = await connection.execute(
    `SELECT *
     FROM dispatch_settlements
     WHERE id = ?
     LIMIT 1`,
    [result.insertId]
  );

  return rows[0] || null;
}

async function findActiveSettlementByDispatch(dispatchId, connection = null, { forUpdate = false } = {}) {
  const sql = `SELECT *
     FROM dispatch_settlements
     WHERE dispatch_request_id = ?
       AND status IN ('draft', 'posted')
     ORDER BY id DESC
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`;

  const rows = connection
    ? (await connection.execute(sql, [dispatchId]))[0]
    : await query(sql, [dispatchId]);

  return rows[0] || null;
}

async function findDraftSettlementByDispatch(dispatchId, connection = null, { forUpdate = false } = {}) {
  const sql = `SELECT *
     FROM dispatch_settlements
     WHERE dispatch_request_id = ?
       AND status = 'draft'
     ORDER BY id DESC
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`;

  const rows = connection
    ? (await connection.execute(sql, [dispatchId]))[0]
    : await query(sql, [dispatchId]);

  return rows[0] || null;
}

async function findSettlementById(id) {
  return findById('dispatch_settlements', id);
}

async function listSettlementsByDispatch(dispatchId) {
  return query(
    `SELECT id, store_id, dispatch_request_id, settlement_number, settlement_date,
      total_expected, total_collected, total_debt, total_returned_value, status,
      settled_by, notes, created_at
     FROM dispatch_settlements
     WHERE dispatch_request_id = ?
     ORDER BY created_at DESC, id DESC`,
    [dispatchId]
  );
}

async function lockSettlement(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM dispatch_settlements
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function getSettlementCustomers(settlementId, connection = null, { forUpdate = false } = {}) {
  const sql = `SELECT dsc.id, dsc.dispatch_settlement_id, dsc.dispatch_customer_id,
      dsc.customer_id, c.name AS customer_name, dsc.expected_amount,
      dsc.collected_amount, dsc.debt_amount, dsc.settlement_status,
      dsc.notes, dsc.created_at
     FROM dispatch_settlement_customers dsc
     JOIN customers c ON c.id = dsc.customer_id
     WHERE dsc.dispatch_settlement_id = ?
     ORDER BY dsc.id ASC${forUpdate ? ' FOR UPDATE' : ''}`;

  if (connection) {
    const [rows] = await connection.execute(sql, [settlementId]);
    return rows;
  }

  return query(
    sql,
    [settlementId]
  );
}

async function countDispatchCustomers(dispatchId) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM dispatch_customers
     WHERE dispatch_request_id = ?`,
    [dispatchId]
  );

  return Number(rows[0]?.total || 0);
}

async function countPostedSettlementCustomers(dispatchId, connection = null) {
  const sql = `SELECT COUNT(DISTINCT dsc.dispatch_customer_id) AS total
     FROM dispatch_settlement_customers dsc
     JOIN dispatch_settlements ds ON ds.id = dsc.dispatch_settlement_id
     WHERE ds.dispatch_request_id = ?
       AND ds.status = 'posted'`;
  const rows = connection
    ? (await connection.execute(sql, [dispatchId]))[0]
    : await query(sql, [dispatchId]);

  return Number(rows[0]?.total || 0);
}

async function findPostedSettlementCustomer(dispatchId, dispatchCustomerId, connection = null) {
  const sql = `SELECT dsc.*
     FROM dispatch_settlement_customers dsc
     JOIN dispatch_settlements ds ON ds.id = dsc.dispatch_settlement_id
     WHERE ds.dispatch_request_id = ?
       AND dsc.dispatch_customer_id = ?
       AND ds.status = 'posted'
     LIMIT 1`;
  const rows = connection
    ? (await connection.execute(sql, [dispatchId, dispatchCustomerId]))[0]
    : await query(sql, [dispatchId, dispatchCustomerId]);

  return rows[0] || null;
}

async function sumPostedSettlementTotals(dispatchId, connection = null) {
  const sql = `SELECT
       COALESCE(SUM(total_expected), 0) AS total_expected,
       COALESCE(SUM(total_collected), 0) AS total_collected,
       COALESCE(SUM(total_debt), 0) AS total_debt
     FROM dispatch_settlements
     WHERE dispatch_request_id = ?
       AND status = 'posted'`;
  const rows = connection
    ? (await connection.execute(sql, [dispatchId]))[0]
    : await query(sql, [dispatchId]);

  return rows[0] || { total_expected: 0, total_collected: 0, total_debt: 0 };
}

async function addSettlementCustomer(data, connection = null) {
  if (!connection) {
    return insertRecord('dispatch_settlement_customers', data);
  }

  const [result] = await connection.execute(
    `INSERT INTO dispatch_settlement_customers (
      dispatch_settlement_id, dispatch_customer_id, customer_id,
      expected_amount, collected_amount, debt_amount, settlement_status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.dispatch_settlement_id,
      data.dispatch_customer_id,
      data.customer_id,
      data.expected_amount,
      data.collected_amount,
      data.debt_amount,
      data.settlement_status,
      nullable(data.notes)
    ]
  );

  const [rows] = await connection.execute(
    `SELECT *
     FROM dispatch_settlement_customers
     WHERE id = ?
     LIMIT 1`,
    [result.insertId]
  );

  return rows[0] || null;
}

async function updateSettlementTotals(connection, settlementId) {
  await connection.execute(
    `UPDATE dispatch_settlements ds
     SET
       total_expected = (
         SELECT COALESCE(SUM(expected_amount), 0)
         FROM dispatch_settlement_customers dsc
         WHERE dsc.dispatch_settlement_id = ds.id
       ),
       total_collected = (
         SELECT COALESCE(SUM(collected_amount), 0)
         FROM dispatch_settlement_customers dsc
         WHERE dsc.dispatch_settlement_id = ds.id
       ),
       total_debt = (
         SELECT COALESCE(SUM(debt_amount), 0)
         FROM dispatch_settlement_customers dsc
         WHERE dsc.dispatch_settlement_id = ds.id
       ),
       total_returned_value = (
         SELECT COALESCE(SUM(GREATEST(dc.customer_total_amount - dsc.expected_amount, 0)), 0)
         FROM dispatch_settlement_customers dsc
         JOIN dispatch_customers dc ON dc.id = dsc.dispatch_customer_id
         WHERE dsc.dispatch_settlement_id = ds.id
       )
     WHERE ds.id = ?`,
    [settlementId]
  );
}

async function completeSettlement(connection, settlementId) {
  await connection.execute(
    `UPDATE dispatch_settlements
     SET status = 'posted'
     WHERE id = ?`,
    [settlementId]
  );
}

async function cancelSettlement(connection, settlementId) {
  await connection.execute(
    `UPDATE dispatch_settlements
     SET status = 'cancelled'
     WHERE id = ? AND status = 'draft'`,
    [settlementId]
  );
}

module.exports = {
  addSettlementCustomer,
  aggregateDispatchAssignmentItems,
  aggregateDispatchItems,
  completeSettlement,
  createDispatchCustomer,
  createDispatchItem,
  createDispatchRequest,
  createDispatchReturn,
  createSettlement,
  countDispatchCustomers,
  countPostedSettlementCustomers,
  findActiveSettlementByDispatch,
  findDraftSettlementByDispatch,
  findDispatchCustomerById,
  findDispatchItemById,
  findDispatchRequestById,
  findSettlementById,
  findPostedSettlementCustomer,
  getDispatchCustomers,
  getDispatchItems,
  getSettlementCustomers,
  lockDispatchItem,
  listSettlementsByDispatch,
  listDispatchRequests,
  lockDispatchRequest,
  lockSettlement,
  recalculateDispatchTotals,
  cancelSettlement,
  updateDispatchCustomerSettlement,
  updateDispatchCustomerReceiptNumber,
  updateDispatchItemUnitCost,
  updateDispatchRequest,
  updateSettlementTotals,
  sumPostedSettlementTotals
};
