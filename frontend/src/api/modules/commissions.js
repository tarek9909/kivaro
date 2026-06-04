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
      calculate: (payload, options) => client.post('/commissions/calculate', payload, options),
      approve: (id, options) => client.post(`/commissions/${id}/approve`, undefined, options),
      pay: (id, payload, options) => client.post(`/commissions/${id}/pay`, payload, options)
    }
  };
}
