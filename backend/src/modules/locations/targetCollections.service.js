const { toMoney } = require('../../utils/money');

async function findEligibleTarget(connection, { storeId, salesmanId, sublocationId, collectionDate }) {
  const [exact] = await connection.execute(
    `SELECT st.id
     FROM salesman_targets st
     JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
     JOIN location_targets lt ON lt.id = slt.location_target_id
     WHERE st.store_id = ? AND st.salesman_id = ? AND slt.sublocation_id = ?
       AND st.status = 'active' AND slt.status = 'active' AND lt.status = 'active'
       AND ? BETWEEN lt.period_start AND lt.period_end
       AND NOT EXISTS (
         SELECT 1 FROM target_events te
         WHERE te.salesman_target_id = st.id AND te.event_type = 'salesman_deactivated'
       )
     ORDER BY lt.period_start ASC, st.id ASC LIMIT 1`,
    [storeId, salesmanId, sublocationId, collectionDate]
  );
  if (exact[0]) return { salesmanTargetId: exact[0].id, late: false, effectiveDate: collectionDate };

  const [next] = await connection.execute(
    `SELECT st.id, lt.period_start
     FROM salesman_targets st
     JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
     JOIN location_targets lt ON lt.id = slt.location_target_id
     WHERE st.store_id = ? AND st.salesman_id = ? AND slt.sublocation_id = ?
       AND st.status = 'active' AND slt.status = 'active' AND lt.status = 'active'
       AND lt.period_start > ?
       AND NOT EXISTS (
         SELECT 1 FROM target_events te
         WHERE te.salesman_target_id = st.id AND te.event_type = 'salesman_deactivated'
       )
     ORDER BY lt.period_start ASC, st.id ASC LIMIT 1`,
    [storeId, salesmanId, sublocationId, collectionDate]
  );
  return next[0]
    ? { salesmanTargetId: next[0].id, late: true, effectiveDate: next[0].period_start }
    : { salesmanTargetId: null, late: true, effectiveDate: collectionDate };
}

async function recordCollection(connection, data) {
  if (!data.amount || Number(data.amount) === 0) return null;
  const resolved = await findEligibleTarget(connection, data);
  const [result] = await connection.execute(
    `INSERT IGNORE INTO target_collection_credits (
      store_id, salesman_target_id, salesman_id, sublocation_id, dispatch_customer_id,
      source_type, source_id, amount, collection_date, original_collection_date,
      is_late_exception, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.storeId, resolved.salesmanTargetId, data.salesmanId, data.sublocationId,
      data.dispatchCustomerId || null, data.sourceType, data.sourceId, toMoney(data.amount),
      resolved.effectiveDate, resolved.late ? data.collectionDate : null,
      resolved.late ? 1 : 0, data.notes || null
    ]
  );
  if (!result.insertId) return null;
  if (!resolved.salesmanTargetId) {
    if (resolved.late) {
      await connection.execute(
        `INSERT INTO audit_logs (store_id, module, action, table_name, record_id, new_values, description)
         VALUES (?, 'targets', 'late_collection_unassigned', 'target_collection_credits', ?, ?,
           'Late collection has no eligible open target and requires manager review')`,
        [data.storeId, result.insertId, JSON.stringify({ salesman_id: data.salesmanId, sublocation_id: data.sublocationId, amount: toMoney(data.amount), original_collection_date: data.collectionDate })]
      );
    }
    return result.insertId;
  }

  const [targetRows] = await connection.execute(
    `SELECT st.target_amount, st.salesman_id, s.user_id, slt.location_target_id,
      COALESCE(SUM(tcc.amount), 0) AS collected_amount
     FROM salesman_targets st
     JOIN salesmen s ON s.id = st.salesman_id
     JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
     LEFT JOIN target_collection_credits tcc ON tcc.salesman_target_id = st.id
     WHERE st.id = ?
     GROUP BY st.id, st.target_amount, st.salesman_id, s.user_id, slt.location_target_id`,
    [resolved.salesmanTargetId]
  );
  const target = targetRows[0];
  if (!target || Number(target.target_amount) <= 0) return result.insertId;
  const percent = (Number(target.collected_amount) / Number(target.target_amount)) * 100;
  const milestones = [
    ['50', percent >= 50],
    ['100', percent >= 100],
    ['above', percent > 100]
  ];
  for (const [milestone, reached] of milestones) {
    if (!reached) continue;
    const [milestoneInsert] = await connection.execute(
      'INSERT IGNORE INTO target_notification_events (salesman_target_id, milestone) VALUES (?, ?)',
      [resolved.salesmanTargetId, milestone]
    );
    if (!milestoneInsert.affectedRows) continue;
    const [managers] = await connection.execute(
      `SELECT DISTINCT u.id FROM users u JOIN roles r ON r.id = u.role_id
       JOIN role_permissions rp ON rp.role_id = r.id JOIN permissions p ON p.id = rp.permission_id
       WHERE u.store_id = ? AND u.status = 'active' AND p.permission_key = 'targets.manage'`,
      [data.storeId]
    );
    const recipientIds = new Set(managers.map((row) => row.id));
    if (target.user_id) recipientIds.add(target.user_id);
    for (const userId of recipientIds) {
      await connection.execute(
        `INSERT INTO notifications (store_id, user_id, title, message, notification_type, reference_type, reference_id)
         VALUES (?, ?, ?, ?, 'success', 'salesman_target', ?)`,
        [data.storeId, userId, 'Target milestone reached', `A target reached ${milestone === 'above' ? 'above 100' : milestone}% of collected cash.`, resolved.salesmanTargetId]
      );
    }
    await connection.execute(
      `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description, payload)
       VALUES (?, ?, ?, 'milestone', ?, ?)`,
      [data.storeId, target.location_target_id, resolved.salesmanTargetId, `Collected-cash target milestone: ${milestone}%`, JSON.stringify({ milestone, percent })]
    );
  }
  if (resolved.late) {
    await connection.execute(
      `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description, payload)
       VALUES (?, ?, ?, 'late_collection', 'Backdated collection attributed to the next open target period', ?)`,
      [data.storeId, target.location_target_id, resolved.salesmanTargetId, JSON.stringify({ original_collection_date: data.collectionDate, collection_date: resolved.effectiveDate })]
    );
  }
  return result.insertId;
}

module.exports = { recordCollection };
