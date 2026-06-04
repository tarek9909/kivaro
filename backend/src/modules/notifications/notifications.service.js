const ApiError = require('../../utils/ApiError');
const { assertRowInScope, resolveStoreId, scopedData, scopedQuery } = require('../../utils/storeScope');
const model = require('./notifications.model');

async function getNotification(id, userId, actor = {}) {
  const notification = await model.findNotificationById(id);

  if (!notification || Number(notification.user_id) !== Number(userId)) {
    throw ApiError.notFound('Notification not found');
  }

  return assertRowInScope(notification, actor, 'Notification not found');
}

async function markRead(id, userId, actor = {}) {
  await getNotification(id, userId, actor);
  return model.markRead(id);
}

module.exports = {
  createNotification: (data, actor = {}) => model.createNotification(scopedData(data, actor, { requireForSuperadmin: false })),
  getNotification,
  listNotifications: (query, userId, actor = {}) => model.listNotifications(scopedQuery(query, actor), userId),
  markAllRead: (userId, actor = {}) => model.markAllRead(userId, resolveStoreId(actor, actor, { requireForSuperadmin: false })),
  markRead
};
