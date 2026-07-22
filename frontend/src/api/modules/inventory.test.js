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
  it('exposes only canonical item catalog, balance, movement, and carton resources', () => {
    const api = createInventoryApi(buildClientStub());

    expect(Object.keys(api).sort()).toEqual([
      'cartonLots',
      'categories',
      'items',
      'openCartonShelves',
      'stockAdjustments',
      'stockBalances',
      'stockMovements',
      'stockReceipts',
      'units',
      'warehouses'
    ]);
    const crud = ['list', 'create', 'get', 'update', 'remove'];
    for (const resource of ['units', 'warehouses']) {
      expect(Object.keys(api[resource]).sort()).toEqual(crud.slice().sort());
    }
    for (const resource of ['categories', 'items']) {
      expect(Object.keys(api[resource]).sort()).toEqual([...crud, 'hardDelete'].sort());
    }
  });

  it('uses list-only APIs for balances, movements, lots, and open shelves', () => {
    const api = createInventoryApi(buildClientStub());

    expect(Object.keys(api.stockBalances)).toEqual(['list']);
    expect(Object.keys(api.stockMovements)).toEqual(['list']);
    expect(Object.keys(api.cartonLots)).toEqual(['list']);
    expect(Object.keys(api.openCartonShelves)).toEqual(['list']);
    expect(Object.keys(api.stockReceipts)).toEqual(['create']);
    expect(Object.keys(api.stockAdjustments).sort()).toEqual(['create', 'list']);
  });

  it('routes canonical item receipts, adjustments, and carton state to their endpoints', async () => {
    const client = buildClientStub();
    const api = createInventoryApi(client);

    await api.items.list({ item_kind: 'normal', stock_mode: 'carton_weight' });
    await api.stockReceipts.create({ warehouse_id: 1, item_id: 2, carton_count: 4, cost_per_carton: 10 });
    await api.stockAdjustments.create({ warehouse_id: 1, item_id: 2, quantity_change: 5, reason: 'count' });
    await api.cartonLots.list({ item_id: 2 });
    await api.openCartonShelves.list({ warehouse_id: 1, item_id: 2 });

    expect(client.calls).toEqual([
      {
        method: 'get',
        path: '/items',
        rest: [{ params: { item_kind: 'normal', stock_mode: 'carton_weight' } }]
      },
      {
        method: 'post',
        path: '/stock-receipts',
        rest: [{ warehouse_id: 1, item_id: 2, carton_count: 4, cost_per_carton: 10 }, undefined]
      },
      {
        method: 'post',
        path: '/stock-adjustments',
        rest: [{ warehouse_id: 1, item_id: 2, quantity_change: 5, reason: 'count' }, undefined]
      },
      {
        method: 'get',
        path: '/carton-lots',
        rest: [{ params: { item_id: 2 } }]
      },
      {
        method: 'get',
        path: '/open-carton-shelves',
        rest: [{ params: { warehouse_id: 1, item_id: 2 } }]
      }
    ]);
  });
});
