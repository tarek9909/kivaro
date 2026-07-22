import { createResourceApi } from '../resourceApi.js';

/**
 * Dispatches are built from sale-catalog offers.  The browser never works out
 * stock sources, carton conversions, ready-container capacity, or document
 * completion itself: those are all server-authoritative concerns.
 */
export function createDispatchApi(client) {
  const dispatchRequests = createResourceApi(client, '/dispatch-requests', {
    only: ['list', 'create', 'get', 'update']
  });

  return {
    requests: {
      ...dispatchRequests,
      createFromPos: (payload, options) => client.post('/dispatch-requests/from-pos', payload, options),
      addCustomer: (id, payload, options) => client.post(`/dispatch-requests/${id}/customers`, payload, options),
      submit: (id, options) => client.post(`/dispatch-requests/${id}/submit`, undefined, options),
      rework: (id, payload, options) => client.post(`/dispatch-requests/${id}/rework`, payload, options),
      approve: (id, options) => client.post(`/dispatch-requests/${id}/approve`, undefined, options),
      dispatchStock: (id, options) => client.post(`/dispatch-requests/${id}/dispatch`, undefined, options),
      cancel: (id, options) => client.post(`/dispatch-requests/${id}/cancel`, undefined, options),
      createReturn: (id, payload, options) => client.post(`/dispatch-requests/${id}/returns`, payload, options),
      createCloseout: (id, payload, options) => client.post(`/dispatch-requests/${id}/closeout`, payload, options),
      settlements: (id, options) => client.get(`/dispatch-requests/${id}/settlements`, options)
    },
    customers: {
      addItem: (id, payload, options) => client.post(`/dispatch-customers/${id}/items`, payload, options)
    },
    items: {
      update: (id, payload, options) => client.patch(`/dispatch-items/${id}`, payload, options),
      remove: (id, options) => client.delete(`/dispatch-items/${id}`, options)
    },
    documents: {
      customerTablePdf: (id, options) => client.get(`/dispatch-requests/${id}/documents/customer-table`, {
        ...options,
        responseType: 'blob'
      }),
      quantityTablePdf: (id, options) => client.get(`/dispatch-requests/${id}/documents/quantity-table`, {
        ...options,
        responseType: 'blob'
      })
    },
    invoices: {
      list: (params, options) => client.get('/invoices', { ...options, params }),
      get: (id, options) => client.get(`/invoices/${id}`, options),
      pdf: (id, options) => client.get(`/invoices/${id}/pdf`, {
        ...options,
        responseType: 'blob'
      })
    },
    settlements: {
      get: (id, options) => client.get(`/dispatch-settlements/${id}`, options),
      post: (id, payload, options) => client.post(`/dispatch-settlements/${id}/post`, payload, options)
    }
  };
}
