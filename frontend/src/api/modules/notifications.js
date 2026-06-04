export function createNotificationsApi(client) {
  return {
    list: (params, options) => client.get('/notifications', { ...options, params }),
    create: (payload, options) => client.post('/notifications', payload, options),
    markAllRead: (options) => client.patch('/notifications/read-all', undefined, options),
    markRead: (id, options) => client.patch(`/notifications/${id}/read`, undefined, options)
  };
}
