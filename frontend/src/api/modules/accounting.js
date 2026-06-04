import { createResourceApi } from '../resourceApi.js';

export function createAccountingApi(client) {
  const expenseCategories = createResourceApi(client, '/expense-categories', {
    only: ['list', 'create', 'update', 'remove']
  });
  const expenses = createResourceApi(client, '/expenses', {
    only: ['list', 'create', 'get', 'update', 'remove']
  });

  return {
    expenseCategories,
    expenses,
    cashAccounts: {
      list: (params, options) => client.get('/cash-accounts', { ...options, params }),
      create: (payload, options) => client.post('/cash-accounts', payload, options),
      update: (id, payload, options) => client.patch(`/cash-accounts/${id}`, payload, options)
    },
    financialTransactions: {
      list: (params, options) => client.get('/financial-transactions', { ...options, params })
    },
    salesmanBalances: {
      list: (params, options) => client.get('/salesman-balances', { ...options, params }),
      get: (id, options) => client.get(`/salesman-balances/${id}`, options),
      close: (id, options) => client.post(`/salesman-balances/${id}/close`, undefined, options)
    }
  };
}
