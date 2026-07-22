import { createReadOnlyResourceApi, createResourceApi } from '../resourceApi.js';

/**
 * Packaging is deliberately separate from the generic inventory API.  A
 * packaging group is a flat template and its outputs are represented by ready
 * containers and sale-catalog entries, not inventory variants.
 */
export function createPackagingApi(client) {
  const groups = createResourceApi(client, '/packaging-groups', {
    only: ['list', 'create', 'get', 'update', 'remove']
  });
  const operations = createReadOnlyResourceApi(client, '/packaging-operations', {
    only: ['list', 'get']
  });
  const readyStock = createReadOnlyResourceApi(client, '/ready-stock', {
    only: ['list']
  });
  const saleCatalog = createResourceApi(client, '/sale-catalog', {
    only: ['list', 'create', 'get', 'update']
  });

  return {
    groups: {
      ...groups,
      replaceComponents: (id, components, options) =>
        client.put(`/packaging-groups/${id}/components`, { components }, options),
      preview: (id, payload, options) =>
        client.post(`/packaging-groups/${id}/preview`, payload, options),
      complete: (id, payload, options) =>
        client.post(`/packaging-groups/${id}/complete`, payload, options)
    },
    operations,
    readyStock,
    saleCatalog: {
      ...saleCatalog,
      listPos: (params, options) => client.get('/sale-catalog/pos', { ...options, params })
    }
  };
}
