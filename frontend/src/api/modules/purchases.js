import { createResourceApi } from '../resourceApi.js';

export function createPurchasesApi(client) {
  const suppliers = createResourceApi(client, '/suppliers', {
    only: ['list', 'create', 'get', 'update', 'remove']
  });
  const purchaseOrders = createResourceApi(client, '/purchase-orders', {
    only: ['list', 'create', 'get', 'update']
  });

  return {
    suppliers,
    purchaseOrders: {
      ...purchaseOrders,
      submit: (id, options) => client.post(`/purchase-orders/${id}/submit`, undefined, options),
      approve: (id, options) => client.post(`/purchase-orders/${id}/approve`, undefined, options),
      cancel: (id, options) => client.post(`/purchase-orders/${id}/cancel`, undefined, options),
      receive: (id, payload, options) => client.post(`/purchase-orders/${id}/receipts`, payload, options),
      receipts: (id, options) => client.get(`/purchase-orders/${id}/receipts`, options)
    },
    supplierPayments: {
      list: (params, options) => client.get('/supplier-payments', { ...options, params }),
      create: (payload, options) => client.post('/supplier-payments', payload, options)
    }
  };
}
