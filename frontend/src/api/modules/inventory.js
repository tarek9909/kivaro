import { createReadOnlyResourceApi, createResourceApi } from '../resourceApi.js';

const RESOURCE_METHODS = ['list', 'create', 'get', 'update', 'remove'];

export function createInventoryApi(client) {
  const categories = createResourceApi(client, '/item-categories', { only: RESOURCE_METHODS });
  const items = createResourceApi(client, '/items', { only: RESOURCE_METHODS });

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
    warehouses: createResourceApi(client, '/warehouses', { only: RESOURCE_METHODS }),
    stockBalances: {
      list: (params, options) => client.get('/stock-balances', { ...options, params })
    },
    stockMovements: createReadOnlyResourceApi(client, '/stock-movements', { only: ['list'] }),
    stockAdjustments: {
      list: (params, options) => client.get('/stock-adjustments', { ...options, params }),
      create: (payload, options) => client.post('/stock-adjustments', payload, options)
    },
    stockReceipts: {
      create: (payload, options) => client.post('/stock-receipts', payload, options)
    },
    cartonLots: {
      list: (params, options) => client.get('/carton-lots', { ...options, params })
    },
    openCartonShelves: {
      list: (params, options) => client.get('/open-carton-shelves', { ...options, params })
    }
  };
}
