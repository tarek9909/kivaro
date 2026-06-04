import { createReadOnlyResourceApi, createResourceApi } from '../resourceApi.js';

const RESOURCE_METHODS = ['list', 'create', 'get', 'update', 'remove'];

export function createInventoryApi(client) {
  const categories = createResourceApi(client, '/item-categories', { only: RESOURCE_METHODS });
  const items = createResourceApi(client, '/items', { only: RESOURCE_METHODS });
  const variants = createResourceApi(client, '/item-variants', { only: RESOURCE_METHODS });
  const groups = createResourceApi(client, '/packaging-groups', { only: RESOURCE_METHODS });

  return {
    categories: {
      ...categories,
      hardDelete: (id, options) => client.delete(`/item-categories/${id}/hard`, options)
    },
    units: createResourceApi(client, '/units', { only: RESOURCE_METHODS }),
    items: {
      ...items,
      hardDelete: (id, options) => client.delete(`/items/${id}/hard`, options)
    },
    variants: {
      ...variants,
      hardDelete: (id, options) => client.delete(`/item-variants/${id}/hard`, options)
    },
    warehouses: createResourceApi(client, '/warehouses', { only: RESOURCE_METHODS }),
    packagingGroups: {
      ...groups,
      addComponent: (id, payload, options) =>
        client.post(`/packaging-groups/${id}/components`, payload, options),
      calculate: (id, payload, options) =>
        client.post(`/packaging-groups/${id}/calculate`, payload, options),
      hardDelete: (id, options) => client.delete(`/packaging-groups/${id}/hard`, options)
    },
    packagingComponents: {
      update: (id, payload, options) =>
        client.patch(`/packaging-group-components/${id}`, payload, options),
      remove: (id, options) => client.delete(`/packaging-group-components/${id}`, options)
    },
    packagingAssignments: {
      ...createResourceApi(client, '/packaging-assignments', {
        only: ['list', 'create']
      }),
      hardDelete: (id, options) => client.delete(`/packaging-assignments/${id}/hard`, options)
    },
    packagingAssignmentActions: {
      consume: (id, payload, options) =>
        client.post(`/packaging-assignments/${id}/consume`, payload, options)
    },
    stockBalances: {
      list: (params, options) => client.get('/stock-balances', { ...options, params })
    },
    stockMovements: createReadOnlyResourceApi(client, '/stock-movements', { only: ['list'] }),
    stockAdjustments: {
      list: (params, options) => client.get('/stock-adjustments', { ...options, params }),
      create: (payload, options) => client.post('/stock-adjustments', payload, options)
    }
  };
}
