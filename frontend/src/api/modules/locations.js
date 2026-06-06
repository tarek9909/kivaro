import { createResourceApi } from '../resourceApi.js';

const RESOURCE_METHODS = ['list', 'create', 'get', 'update', 'remove'];

export function createLocationsApi(client) {
  const locations = createResourceApi(client, '/locations', { only: RESOURCE_METHODS });
  const sublocations = createResourceApi(client, '/sublocations', {
    only: ['list', 'create', 'update', 'remove']
  });
  const salesmen = createResourceApi(client, '/salesmen', { only: RESOURCE_METHODS });
  const locationTargets = createResourceApi(client, '/location-targets', {
    only: ['list', 'create', 'get', 'update']
  });

  return {
    locations: {
      ...locations,
      sublocations: (id, params, options) => client.get(`/locations/${id}/sublocations`, { ...options, params })
    },
    sublocations,
    salesmen: {
      ...salesmen,
      sublocations: (id, params, options) => client.get(`/salesmen/${id}/sublocations`, { ...options, params }),
      assignSublocation: (id, payload, options) => client.post(`/salesmen/${id}/sublocations`, payload, options),
      unassignSublocation: (id, sublocationId, options) => (
        client.delete(`/salesmen/${id}/sublocations/${sublocationId}`, options)
      )
    },
    locationTargets: {
      ...locationTargets,
      createSublocationTarget: (id, payload, options) => (
        client.post(`/location-targets/${id}/sublocation-targets`, payload, options)
      )
    },
    sublocationTargets: {
      generateSalesmanTargets: (id, options) => (
        client.post(`/sublocation-targets/${id}/generate-salesman-targets`, undefined, options)
      )
    }
  };
}
