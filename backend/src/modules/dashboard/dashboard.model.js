const { query } = require('../../bootstrap/db');

async function getSummary(storeId) {
  const rows = await query(
    `SELECT
      COALESCE((
        SELECT SUM(dr.total_collected)
        FROM dispatch_requests dr
        WHERE dr.store_id = ?
          AND dr.status = 'completed'
          AND DATE_FORMAT(COALESCE(dr.completed_at, dr.request_date), '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
      ), 0) AS monthly_collections,
      COALESCE((
        SELECT SUM(ca.current_balance)
        FROM cash_accounts ca
        WHERE ca.store_id = ?
          AND ca.status = 'active'
      ), 0) AS cash_balance,
      COALESCE((
        SELECT SUM(cd.remaining_amount)
        FROM customer_debts cd
        WHERE cd.store_id = ?
          AND cd.status IN ('pending', 'partially_paid')
      ), 0) AS open_receivables,
      (
        SELECT COUNT(*)
        FROM dispatch_requests dr
        WHERE dr.store_id = ?
          AND dr.status IN ('pending_approval', 'approved', 'dispatched', 'partially_settled')
      ) AS active_dispatches,
      (
        SELECT COUNT(*)
        FROM production_batches pb
        WHERE pb.store_id = ?
          AND pb.status IN ('draft', 'in_progress')
      ) AS active_batches,
      (
        SELECT COUNT(*)
        FROM stock_balances sb
        WHERE sb.store_id = ?
          AND (sb.quantity_on_hand - sb.quantity_reserved) <= 0
      ) AS unavailable_stock_variants`,
    [storeId, storeId, storeId, storeId, storeId, storeId]
  );

  return rows[0] || {};
}

async function getBenchmarks(storeId) {
  const rows = await query(
    `SELECT
      (SELECT COUNT(*) FROM dispatch_requests WHERE store_id = ? AND DATE_FORMAT(request_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')) AS dispatch_total,
      (SELECT COUNT(*) FROM dispatch_requests WHERE store_id = ? AND status = 'completed' AND DATE_FORMAT(COALESCE(completed_at, request_date), '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')) AS dispatch_done,
      (SELECT COUNT(*) FROM production_batches WHERE store_id = ? AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')) AS production_total,
      (SELECT COUNT(*) FROM production_batches WHERE store_id = ? AND status = 'completed' AND DATE_FORMAT(COALESCE(completed_at, started_at, created_at), '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')) AS production_done,
      (SELECT COUNT(*) FROM purchase_orders WHERE store_id = ? AND DATE_FORMAT(order_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')) AS purchase_total,
      (SELECT COUNT(*) FROM purchase_orders WHERE store_id = ? AND status = 'received' AND DATE_FORMAT(order_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')) AS purchase_done,
      COALESCE((
        SELECT AVG(
          CASE
            WHEN target_amount > 0 THEN LEAST((achieved_sales_amount / target_amount) * 100, 100)
            ELSE 0
          END
        )
        FROM v_salesman_target_progress
        WHERE store_id = ?
          AND CURDATE() BETWEEN period_start AND period_end
      ), 0) AS target_progress`,
    [storeId, storeId, storeId, storeId, storeId, storeId, storeId]
  );

  return rows[0] || {};
}

async function getActivity(storeId, limit = 8) {
  return query(
    `SELECT sm.id, sm.movement_type, sm.quantity_change, sm.reference_type, sm.reference_id,
      sm.created_at, w.name AS warehouse_name, i.name AS item_name, iv.variant_name
     FROM stock_movements sm
     JOIN warehouses w ON w.id = sm.warehouse_id
     JOIN item_variants iv ON iv.id = sm.item_variant_id
     JOIN items i ON i.id = iv.item_id
     WHERE sm.store_id = ?
     ORDER BY sm.created_at DESC, sm.id DESC
     LIMIT ?`,
    [storeId, limit]
  );
}

async function getNotifications(storeId, userId, limit = 5) {
  return query(
    `SELECT id, title, message, notification_type, reference_type, reference_id, read_at, created_at
     FROM notifications
     WHERE store_id = ?
       AND user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
    [storeId, userId, limit]
  );
}

module.exports = {
  getActivity,
  getBenchmarks,
  getNotifications,
  getSummary
};
