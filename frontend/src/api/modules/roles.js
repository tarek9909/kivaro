import { createResourceApi } from '../resourceApi.js';

export function createRolesApi(client) {
  const roles = createResourceApi(client, '/roles', {
    only: ['list', 'create', 'get', 'update', 'remove']
  });

  return {
    ...roles,
    permissions: {
      list: (options) => client.get('/permissions', options)
    },
    replacePermissions: (id, payload, options) => client.put(`/roles/${id}/permissions`, payload, options)
  };
}
