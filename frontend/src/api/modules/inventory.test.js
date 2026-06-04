import { describe, expect, it } from 'vitest';
import { createInventoryApi } from './inventory.js';

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

describe('inventory API module', () => {
  it('only exposes backend-supported CRUD methods on each resource', () => {
    const client = buildClientStub();
    const api = createInventoryApi(client);
    const expected = ['list', 'create', 'get', 'update', 'remove'];
    for (const resource of ['units', 'warehouses']) {
      expect(Object.keys(api[resource]).sort()).toEqual(expected.slice().sort());
    }
    for (const resource of ['categories', 'items', 'variants']) {
      expect(Object.keys(api[resource]).sort()).toEqual([...expected, 'hardDelete'].sort());
    }
  });

  it('routes stockBalances and stockMovements as list-only', () => {
    const client = buildClientStub();
    const api = createInventoryApi(client);
    expect(Object.keys(api.stockBalances)).toEqual(['list']);
    expect(Object.keys(api.stockMovements)).toEqual(['list']);
  });

  it('exposes stock-adjustments list and create', () => {
    const client = buildClientStub();
    const api = createInventoryApi(client);
    expect(Object.keys(api.stockAdjustments).sort()).toEqual(['create', 'list']);
  });

  it('exposes packaging group, component, and assignment operations', async () => {
    const client = buildClientStub();
    const api = createInventoryApi(client);

    expect(Object.keys(api.packagingGroups).sort()).toEqual([
      'addComponent',
      'calculate',
      'create',
      'get',
      'hardDelete',
      'list',
      'remove',
      'update'
    ]);
    expect(Object.keys(api.packagingComponents).sort()).toEqual(['remove', 'update']);
    expect(Object.keys(api.packagingAssignments).sort()).toEqual(['create', 'hardDelete', 'list']);
    expect(Object.keys(api.packagingAssignmentActions).sort()).toEqual(['consume']);

    await api.packagingGroups.addComponent(4, { level_key: 'item' });
    await api.packagingGroups.calculate(4, { charcoal_quantity_kg: 500 });
    await api.packagingGroups.hardDelete(4);
    await api.packagingAssignments.hardDelete(7);
    await api.packagingAssignmentActions.consume(7, { notes: 'Packed' });

    expect(client.calls).toEqual([
      {
        method: 'post',
        path: '/packaging-groups/4/components',
        rest: [{ level_key: 'item' }, undefined]
      },
      {
        method: 'post',
        path: '/packaging-groups/4/calculate',
        rest: [{ charcoal_quantity_kg: 500 }, undefined]
      },
      {
        method: 'delete',
        path: '/packaging-groups/4/hard',
        rest: [undefined]
      },
      {
        method: 'delete',
        path: '/packaging-assignments/7/hard',
        rest: [undefined]
      },
      {
        method: 'post',
        path: '/packaging-assignments/7/consume',
        rest: [{ notes: 'Packed' }, undefined]
      }
    ]);
  });

  it('hits /stock-adjustments via POST when create is called', async () => {
    const client = buildClientStub();
    const api = createInventoryApi(client);
    await api.stockAdjustments.create({ warehouse_id: 1, item_variant_id: 2, quantity_change: 5, reason: 'test' });
    expect(client.calls).toEqual([
      {
        method: 'post',
        path: '/stock-adjustments',
        rest: [
          { warehouse_id: 1, item_variant_id: 2, quantity_change: 5, reason: 'test' },
          undefined
        ]
      }
    ]);
  });

  it('passes pagination params to /stock-balances list', async () => {
    const client = buildClientStub();
    const api = createInventoryApi(client);
    await api.stockBalances.list({ warehouse_id: 4, limit: 50 });
    expect(client.calls[0]).toEqual({
      method: 'get',
      path: '/stock-balances',
      rest: [{ params: { warehouse_id: 4, limit: 50 } }]
    });
  });
});
