import { describe, expect, it } from 'vitest';
import { createSuperadminApi } from './superadmin.js';

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

describe('superadmin API module', () => {
  it('routes store CRUD calls to the platform namespace', async () => {
    const client = buildClientStub();
    const api = createSuperadminApi(client);

    await api.stores.list({ page: 2 });
    await api.stores.create({ name: 'North', code: 'NORTH' });
    await api.stores.get(9);
    await api.stores.update(9, { name: 'North Hub' });
    await api.stores.remove(9);
    await api.stores.updateStatus(9, { status: 'suspended' });
    await api.platformSettings.get();
    await api.platformSettings.update({ store_url_prefix: 'branch' });

    expect(client.calls).toEqual([
      { method: 'get', path: '/superadmin/stores', rest: [{ params: { page: 2 } }] },
      { method: 'post', path: '/superadmin/stores', rest: [{ name: 'North', code: 'NORTH' }, undefined] },
      { method: 'get', path: '/superadmin/stores/9', rest: [undefined] },
      { method: 'patch', path: '/superadmin/stores/9', rest: [{ name: 'North Hub' }, undefined] },
      { method: 'delete', path: '/superadmin/stores/9', rest: [undefined] },
      { method: 'patch', path: '/superadmin/stores/9/status', rest: [{ status: 'suspended' }, undefined] },
      { method: 'get', path: '/superadmin/platform-settings', rest: [undefined] },
      {
        method: 'patch',
        path: '/superadmin/platform-settings',
        rest: [{ store_url_prefix: 'branch' }, undefined]
      }
    ]);
  });

  it('routes module list and replacement calls', async () => {
    const client = buildClientStub();
    const api = createSuperadminApi(client);

    await api.stores.modules.list(3);
    await api.stores.modules.replace(3, {
      modules: [{ module_key: 'inventory', enabled: false }]
    });

    expect(client.calls).toEqual([
      { method: 'get', path: '/superadmin/stores/3/modules', rest: [undefined] },
      {
        method: 'put',
        path: '/superadmin/stores/3/modules',
        rest: [{ modules: [{ module_key: 'inventory', enabled: false }] }, undefined]
      }
    ]);
  });
});
