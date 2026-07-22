import { describe, expect, it } from 'vitest';
import { createPackagingApi } from './packaging.js';

function buildClientStub() {
  const calls = [];
  const record = (method) => (path, ...rest) => {
    calls.push({ method, path, rest });
    return Promise.resolve({ method, path, rest });
  };
  return {
    calls,
    get: record('get'),
    post: record('post'),
    patch: record('patch'),
    put: record('put'),
    delete: record('delete')
  };
}

describe('packaging API module', () => {
  it('exposes the flat-group and completion endpoints', async () => {
    const client = buildClientStub();
    const api = createPackagingApi(client);

    expect(Object.keys(api.groups).sort()).toEqual([
      'complete', 'create', 'get', 'list', 'preview', 'remove', 'replaceComponents', 'update'
    ].sort());
    expect(Object.keys(api.operations).sort()).toEqual(['get', 'list']);
    expect(Object.keys(api.readyStock)).toEqual(['list']);

    await api.groups.replaceComponents(4, [{ item_id: 12, component_role: 'outer_sellable', quantity_per_outer: 1 }]);
    await api.groups.preview(4, { warehouse_id: 3, output_carton_count: 5 });
    await api.groups.complete(4, { warehouse_id: 3, output_carton_count: 5 });

    expect(client.calls).toEqual([
      {
        method: 'put',
        path: '/packaging-groups/4/components',
        rest: [{ components: [{ item_id: 12, component_role: 'outer_sellable', quantity_per_outer: 1 }] }, undefined]
      },
      {
        method: 'post',
        path: '/packaging-groups/4/preview',
        rest: [{ warehouse_id: 3, output_carton_count: 5 }, undefined]
      },
      {
        method: 'post',
        path: '/packaging-groups/4/complete',
        rest: [{ warehouse_id: 3, output_carton_count: 5 }, undefined]
      }
    ]);
  });

  it('uses the sale catalog and quantity-hidden POS routes', async () => {
    const client = buildClientStub();
    const api = createPackagingApi(client);

    expect(Object.keys(api.saleCatalog).sort()).toEqual(['create', 'get', 'list', 'listPos', 'update']);
    await api.saleCatalog.list({ entry_type: 'ready_inner_unit' });
    await api.saleCatalog.listPos({ warehouse_id: 9 });

    expect(client.calls).toEqual([
      { method: 'get', path: '/sale-catalog', rest: [{ params: { entry_type: 'ready_inner_unit' } }] },
      { method: 'get', path: '/sale-catalog/pos', rest: [{ params: { warehouse_id: 9 } }] }
    ]);
  });
});
