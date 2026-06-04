import { createResourceApi } from '../resourceApi.js';

export function createUsersApi(client) {
  const users = createResourceApi(client, '/users', {
    only: ['list', 'create', 'get', 'update', 'remove']
  });

  return {
    ...users,
    updateStatus: (id, payload, options) => client.patch(`/users/${id}/status`, payload, options)
  };
}
