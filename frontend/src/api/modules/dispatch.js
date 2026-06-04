import { createResourceApi } from '../resourceApi.js';

export function createDispatchApi(client) {
  const dispatchRequests = createResourceApi(client, '/dispatch-requests', {
    only: ['list', 'create', 'get', 'update']
  });

  return {
    requests: {
      ...dispatchRequests,
      addCustomer: (id, payload, options) => (
        client.post(`/dispatch-requests/${id}/customers`, payload, options)
      ),
      submit: (id, options) => client.post(`/dispatch-requests/${id}/submit`, undefined, options),
      approve: (id, options) => client.post(`/dispatch-requests/${id}/approve`, undefined, options),
      dispatchStock: (id, options) => client.post(`/dispatch-requests/${id}/dispatch`, undefined, options),
      cancel: (id, options) => client.post(`/dispatch-requests/${id}/cancel`, undefined, options),
      createReturn: (id, payload, options) => (
        client.post(`/dispatch-requests/${id}/returns`, payload, options)
      ),
      printSummary: (id, params, options) => (
        client.get(`/dispatch-requests/${id}/print-summary`, { ...options, params })
      ),
      printSummaryPdf: (id, options) => (
        client.get(`/dispatch-requests/${id}/print-summary`, {
          ...options,
          params: { ...options?.params, format: 'pdf' },
          responseType: 'blob'
        })
      ),
      printCustomerReceipts: (id, params, options) => (
        client.get(`/dispatch-requests/${id}/print-customer-receipts`, { ...options, params })
      ),
      printCustomerReceiptsPdf: (id, options) => (
        client.get(`/dispatch-requests/${id}/print-customer-receipts`, {
          ...options,
          params: { ...options?.params, format: 'pdf' },
          responseType: 'blob'
        })
      ),
      createSettlement: (id, payload, options) => (
        client.post(`/dispatch-requests/${id}/settlements`, payload, options)
      ),
      settlements: (id, options) => client.get(`/dispatch-requests/${id}/settlements`, options)
    },
    customers: {
      addItem: (id, payload, options) => client.post(`/dispatch-customers/${id}/items`, payload, options)
    },
    settlements: {
      get: (id, options) => client.get(`/dispatch-settlements/${id}`, options),
      addCustomer: (id, payload, options) => (
        client.post(`/dispatch-settlements/${id}/customers`, payload, options)
      ),
      complete: (id, payload, options) => (
        client.post(`/dispatch-settlements/${id}/complete`, payload, options)
      ),
      cancel: (id, options) => (
        client.post(`/dispatch-settlements/${id}/cancel`, undefined, options)
      )
    }
  };
}
