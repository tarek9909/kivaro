import { createResourceApi } from '../resourceApi.js';

export function createProductionApi(client) {
  const configurations = createResourceApi(client, '/packaging-configurations', {
    only: ['list', 'create', 'get', 'update', 'remove']
  });
  const batches = createResourceApi(client, '/production-batches', {
    only: ['list', 'create', 'get']
  });

  return {
    packagingConfigurations: {
      ...configurations,
      addComponent: (id, payload, options) => (
        client.post(`/packaging-configurations/${id}/components`, payload, options)
      ),
      calculateCost: (id, payload, options) => (
        client.post(`/packaging-configurations/${id}/calculate-cost`, payload, options)
      )
    },
    packagingComponents: {
      update: (id, payload, options) => (
        client.patch(`/packaging-configuration-components/${id}`, payload, options)
      ),
      remove: (id, options) => client.delete(`/packaging-configuration-components/${id}`, options)
    },
    productionBatches: {
      ...batches,
      start: (id, options) => client.post(`/production-batches/${id}/start`, undefined, options),
      complete: (id, payload, options) => client.post(`/production-batches/${id}/complete`, payload, options),
      cancel: (id, options) => client.post(`/production-batches/${id}/cancel`, undefined, options)
    }
  };
}
