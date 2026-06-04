const service = require('./notifications.service');
const { successResponse } = require('../../utils/response');

async function listNotifications(req, res) {
  const result = await service.listNotifications(req.query, req.user.id, req.user);
  successResponse(res, {
    message: 'Notifications fetched',
    data: { notifications: result.rows },
    meta: result.meta
  });
}

async function createNotification(req, res) {
  const notification = await service.createNotification(req.body, req.user);
  successResponse(res, {
    statusCode: 201,
    message: 'Notification created',
    data: { notification }
  });
}

async function markRead(req, res) {
  const notification = await service.markRead(req.params.id, req.user.id, req.user);
  successResponse(res, {
    message: 'Notification marked as read',
    data: { notification }
  });
}

async function markAllRead(req, res) {
  const updated = await service.markAllRead(req.user.id, req.user);
  successResponse(res, {
    message: 'Notifications marked as read',
    data: { updated }
  });
}

module.exports = {
  createNotification,
  listNotifications,
  markAllRead,
  markRead
};
