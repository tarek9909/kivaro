export function createPaymentsApi(client) {
  return {
    debts: {
      list: (params, options) => client.get('/customer-debts', { ...options, params }),
      csv: (params, options) => client.get('/customer-debts', { ...options, params: { ...params, format: 'csv' }, responseType: 'text' }),
      get: (id, options) => client.get(`/customer-debts/${id}`, options),
      printPdf: (id, options) => client.get(`/customer-debts/${id}/print`, { ...options, params: { ...options?.params, format: 'pdf' }, responseType: 'blob' }),
      pay: (id, payload, options) => client.post(`/customer-debts/${id}/payments`, payload, options),
      applyCredit: (id, payload = {}, options) => client.post(`/customer-debts/${id}/apply-credit`, payload, options)
    },
    customerPayments: {
      list: (params, options) => client.get('/customer-payments', { ...options, params }),
      create: (payload, options) => client.post('/customer-payments', payload, options),
      csv: (params, options) => client.get('/customer-payments', { ...options, params: { ...params, format: 'csv' }, responseType: 'text' }),
      print: (id, options) => client.get(`/customer-payments/${id}/print`, options),
      printPdf: (id, options) => client.get(`/customer-payments/${id}/print`, { ...options, params: { ...options?.params, format: 'pdf' }, responseType: 'blob' })
    },
    customerCredits: {
      list: (params, options) => client.get('/customer-credits', { ...options, params })
    },
    receipts: {
      list: (params, options) => client.get('/customer-receipts', { ...options, params }),
      csv: (params, options) => client.get('/customer-receipts', { ...options, params: { ...params, format: 'csv' }, responseType: 'text' }),
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
