import { describe, expect, it } from 'vitest';
import { createLocationsApi } from './locations.js';

function buildClientStub() {
  const calls = [];
  function record(method) {
    return (path, ...rest) => {
      calls.push({ method, path, rest });
      return Promise.resolve({ method, path, rest });
    };
  }
  return {
    calls,
    get: record('get'),
    post: record('post'),
    patch: record('patch'),
    put: record('put'),
    delete: record('delete')
  };
}

describe('locations API module', () => {
  it('exposes the backend-supported locations CRUD plus sublocations subroute', () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    expect(Object.keys(api.locations).sort()).toEqual([
      'create',
      'get',
      'list',
      'remove',
      'sublocations',
      'update'
    ]);
  });

  it('exposes only list/create/update/remove on sublocations', () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    expect(Object.keys(api.sublocations).sort()).toEqual([
      'create',
      'list',
      'remove',
      'update'
    ]);
  });

  it('exposes salesmen CRUD plus individual and atomic bulk territory actions', () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    expect(Object.keys(api.salesmen).sort()).toEqual([
      'assignSublocation',
      'create',
      'exportCsv',
      'get',
      'list',
      'remove',
      'replaceSublocations',
      'sublocations',
      'unassignSublocation',
      'update'
    ]);
  });

  it('exposes locationTargets CRUD without remove and a sublocation target action', () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    expect(Object.keys(api.locationTargets).sort()).toEqual([
      'create',
      'createSublocationTarget',
      'get',
      'list',
      'update'
    ]);
  });

  it('exposes only generateSalesmanTargets on sublocationTargets', () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    expect(Object.keys(api.sublocationTargets)).toEqual(['generateSalesmanTargets']);
  });

  it('routes assign and unassign to the correct endpoints', async () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    await api.salesmen.assignSublocation(7, { sublocation_id: 9, assigned_at: '2026-05-27' });
    await api.salesmen.unassignSublocation(7, 9);
    expect(client.calls).toEqual([
      {
        method: 'post',
        path: '/salesmen/7/sublocations',
        rest: [{ sublocation_id: 9, assigned_at: '2026-05-27' }, undefined]
      },
      { method: 'delete', path: '/salesmen/7/sublocations/9', rest: [undefined] }
    ]);
  });

  it('downloads salesman CSV exports from the canonical export endpoint', async () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    await api.salesmen.exportCsv({ dataset: 'revenue', salesman_status: 'active' });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/salesmen/export',
      rest: [{
        params: { dataset: 'revenue', salesman_status: 'active' },
        responseType: 'blob'
      }]
    });
  });

  it('replaces all salesman territories in one PUT request', async () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    await api.salesmen.replaceSublocations(7, {
      sublocation_ids: [9, 10],
      assigned_at: '2026-07-22'
    });
    expect(client.calls[0]).toEqual({
      method: 'put',
      path: '/salesmen/7/sublocations',
      rest: [{ sublocation_ids: [9, 10], assigned_at: '2026-07-22' }, undefined]
    });
  });

  it('reads a salesman\'s sublocations via GET /salesmen/:id/sublocations', async () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    await api.salesmen.sublocations(7, { status: 'active' });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/salesmen/7/sublocations',
      rest: [{ params: { status: 'active' } }]
    });
  });

  it('hits /location-targets/:id/sublocation-targets when adding a sublocation target', async () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    await api.locationTargets.createSublocationTarget(4, {
      sublocation_id: 11,
      target_amount: 250,
      status: 'draft'
    });
    expect(client.calls[0]).toEqual({
      method: 'post',
      path: '/location-targets/4/sublocation-targets',
      rest: [{ sublocation_id: 11, target_amount: 250, status: 'draft' }, undefined]
    });
  });

  it('POSTs to generate-salesman-targets without a body', async () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    await api.sublocationTargets.generateSalesmanTargets(8);
    expect(client.calls[0]).toEqual({
      method: 'post',
      path: '/sublocation-targets/8/generate-salesman-targets',
      rest: [undefined, undefined]
    });
  });

  it('reads a location\'s sublocations via GET /locations/:id/sublocations', async () => {
    const client = buildClientStub();
    const api = createLocationsApi(client);
    await api.locations.sublocations(3, { limit: 50 });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/locations/3/sublocations',
      rest: [{ params: { limit: 50 } }]
    });
  });
});
