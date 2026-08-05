
/**
 * Mini POS deliberately has its own API surface.  Its catalogue is
 * availability-filtered by the server and intentionally never returns stock
 * quantities to the salesman.
 */
export function createPosApi(client) {
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
    workspace: {
      get: (params, options) => client.get('/pos/workspace', { ...options, params })
    }
  };
}
