import { createResourceApi } from '../resourceApi.js';

export function createSuperadminApi(client) {
  const stores = createResourceApi(client, '/superadmin/stores', {
    only: ['list', 'create', 'get', 'update']
  });

  return {
    modules: {
      catalog: (options) => client.get('/superadmin/modules', options)
    },
    platformSettings: {
      get: (options) => client.get('/superadmin/platform-settings', options),
      update: (payload, options) => client.patch('/superadmin/platform-settings', payload, options)
    },
    stores: {
      ...stores,
      getBySlug: (slug, options) =>
        client.get(`/superadmin/stores/slug/${slug}`, options),
      updateStatus: (id, payload, options) =>
        client.patch(`/superadmin/stores/${id}/status`, payload, options),
      impersonate: (id, options) =>
        client.post(`/superadmin/stores/${id}/impersonate`, undefined, options),
      modules: {
        list: (id, options) => client.get(`/superadmin/stores/${id}/modules`, options),
        replace: (id, payload, options) =>
          client.put(`/superadmin/stores/${id}/modules`, payload, options)
      }
    }
  };
}
