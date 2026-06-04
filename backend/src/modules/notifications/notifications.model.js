const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, updateRecord } = require('../../utils/crud');

async function listNotifications(input = {}, currentUserId) {
  const scopedInput = {
    ...input,
    user_id: input.user_id || currentUserId
  };

  return listRecords({
    select: `SELECT id, store_id, user_id, title, message, notification_type, reference_type,
      reference_id, read_at, created_at`,
    from: 'notifications',
    filters: [
      { key: 'user_id', column: 'user_id' },
      { key: 'store_id', column: 'store_id' },
      { key: 'notification_type', column: 'notification_type' },
      { key: 'reference_type', column: 'reference_type' },
      { key: 'reference_id', column: 'reference_id' },
      { key: 'search', type: 'search', fields: ['title', 'message'] }
    ],
    orderBy: 'ORDER BY created_at DESC, id DESC'
  }, scopedInput);
}

async function findNotificationById(id) {
  return findById('notifications', id);
}

async function createNotification(data) {
  return insertRecord('notifications', data);
}

async function markRead(id) {
  return updateRecord('notifications', id, { read_at: new Date() });
}

async function markAllRead(userId, storeId = null) {
  const storeClause = storeId ? ' AND store_id = ?' : '';
  const params = storeId ? [userId, storeId] : [userId];
  const result = await query(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE user_id = ? AND read_at IS NULL${storeClause}`,
    params
  );

  return result.affectedRows;
}

module.exports = {
  createNotification,
  findNotificationById,
  listNotifications,
  markAllRead,
  markRead
};
