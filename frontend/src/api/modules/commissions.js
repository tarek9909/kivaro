import { createResourceApi } from '../resourceApi.js';

export function createCommissionsApi(client) {
  const rules = createResourceApi(client, '/commission-rules', {
    only: ['list', 'create', 'update', 'remove']
  });
  const calculations = createResourceApi(client, '/commissions', {
    only: ['list', 'get']
  });

  return {
    rules,
    calculations: {
      ...calculations,
      approve: (id, options) => client.post(`/commissions/${id}/approve`, undefined, options),
      pay: (id, payload, options) => client.post(`/commissions/${id}/pay`, payload, options)
    },
    payroll: {
      list: (params, options) => client.get('/commission-payroll', { ...options, params }),
      pay: (salesmanId, payload, options) => client.post(`/commission-payroll/${salesmanId}/pay`, payload, options)
    }
  };
}
