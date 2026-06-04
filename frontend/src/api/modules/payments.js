export function createPaymentsApi(client) {
  return {
    debts: {
      list: (params, options) => client.get('/customer-debts', { ...options, params }),
      get: (id, options) => client.get(`/customer-debts/${id}`, options),
      pay: (id, payload, options) => client.post(`/customer-debts/${id}/payments`, payload, options),
      applyCredit: (id, payload, options) => client.post(`/customer-debts/${id}/apply-credit`, payload, options),
      updateStatus: (id, payload, options) => client.patch(`/customer-debts/${id}/status`, payload, options)
    },
    customerPayments: {
      list: (params, options) => client.get('/customer-payments', { ...options, params }),
      create: (payload, options) => client.post('/customer-payments', payload, options)
    },
    customerCredits: {
      list: (params, options) => client.get('/customer-credits', { ...options, params })
    },
    receipts: {
      list: (params, options) => client.get('/customer-receipts', { ...options, params }),
      get: (id, options) => client.get(`/customer-receipts/${id}`, options),
      print: (id, params, options) => client.get(`/customer-receipts/${id}/print`, { ...options, params }),
      printPdf: (id, options) => (
        client.get(`/customer-receipts/${id}/print`, {
          ...options,
          params: { ...options?.params, format: 'pdf' },
          responseType: 'blob'
        })
      )
    }
  };
}
