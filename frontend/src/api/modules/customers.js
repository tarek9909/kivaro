import { createResourceApi } from '../resourceApi.js';

export function createCustomersApi(client) {
  const customers = createResourceApi(client, '/customers', {
    only: ['list', 'create', 'get', 'update', 'remove']
  });

  return {
    ...customers,
    exportCsv: (params, options) => client.get('/customers/export', {
      ...options,
      params,
      responseType: 'blob'
    }),
    receipts: (id, params, options) => client.get(`/customers/${id}/receipts`, { ...options, params }),
    debts: (id, params, options) => client.get(`/customers/${id}/debts`, { ...options, params }),
    payments: (id, params, options) => client.get(`/customers/${id}/payments`, { ...options, params })
  };
}
