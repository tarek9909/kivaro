import { createResourceApi } from '../resourceApi.js';

/**
 * Mini POS deliberately has its own API surface.  Its catalogue is
 * availability-filtered by the server and intentionally never returns stock
 * quantities to the salesman.
 */
export function createPosApi(client) {
  const orders = createResourceApi(client, '/pos/orders', {
    only: ['list', 'create', 'get', 'update']
  });

  return {
    catalog: {
      list: (params, options) => client.get('/pos/catalog', { ...options, params })
    },
    territories: {
      list: (params, options) => client.get('/pos/territories', { ...options, params })
    },
    customers: {
      list: (params, options) => client.get('/pos/customers', { ...options, params }),
      create: (payload, options) => client.post('/pos/customers', payload, options)
    },
    orders: {
      ...orders,
      cancel: (id, payload, options) => client.post(`/pos/orders/${id}/cancel`, payload, options)
    },
    workspace: {
      get: (params, options) => client.get('/pos/workspace', { ...options, params })
    },
    review: {
      list: (params, options) => client.get('/pos/review', { ...options, params }),
      prepareDispatch: (payload, options) => client.post('/pos/review/prepare-dispatch', payload, options)
    }
  };
}
