const { findById, listRecords } = require('../../utils/crud');
const { query } = require('../../bootstrap/db');

async function listAuditLogs(input) {
  return listRecords({
    select: `SELECT al.id, al.user_id, u.full_name AS user_name, al.module, al.action,
      al.table_name, al.record_id, al.store_id, al.old_values, al.new_values, al.ip_address,
      al.user_agent, al.description, al.created_at`,
    from: 'audit_logs al',
    joins: 'LEFT JOIN users u ON u.id = al.user_id',
    filters: [
      { key: 'user_id', column: 'al.user_id' },
      { key: 'store_id', column: 'al.store_id' },
      { key: 'module', column: 'al.module' },
      { key: 'action', column: 'al.action' },
      { key: 'table_name', column: 'al.table_name' },
      { key: 'record_id', column: 'al.record_id' },
      { key: 'date_from', column: 'al.created_at', operator: 'date_gte' },
      { key: 'date_to', column: 'al.created_at', operator: 'date_lte' },
      { key: 'search', type: 'search', fields: ['al.module', 'al.action', 'al.description', 'u.full_name'] }
    ],
    orderBy: 'ORDER BY al.created_at DESC, al.id DESC'
  }, input);
}

async function findAuditLogById(id) {
  const rows = await query(
    `SELECT al.id, al.user_id, u.full_name AS user_name, al.module, al.action,
       al.table_name, al.record_id, al.store_id, al.old_values, al.new_values, al.ip_address,
       al.user_agent, al.description, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAuditLogById,
  listAuditLogs
};
