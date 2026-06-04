import { describe, expect, it } from 'vitest';
import { createProductionApi } from './production.js';

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

describe('production API module', () => {
  it('exposes packagingConfigurations CRUD plus addComponent and calculateCost only', () => {
    const client = buildClientStub();
    const api = createProductionApi(client);
    expect(Object.keys(api.packagingConfigurations).sort()).toEqual([
      'addComponent',
      'calculateCost',
      'create',
      'get',
      'list',
      'remove',
      'update'
    ]);
  });

  it('exposes only update and remove on packagingComponents', () => {
    const client = buildClientStub();
    const api = createProductionApi(client);
    expect(Object.keys(api.packagingComponents).sort()).toEqual(['remove', 'update']);
  });

  it('exposes only the backend-supported batch methods (no remove or update)', () => {
    const client = buildClientStub();
    const api = createProductionApi(client);
    expect(Object.keys(api.productionBatches).sort()).toEqual([
      'cancel',
      'complete',
      'create',
      'get',
      'list',
      'start'
    ]);
  });

  it('exposes only list on productCostHistory', () => {
    const client = buildClientStub();
    const api = createProductionApi(client);
    expect(Object.keys(api.productCostHistory)).toEqual(['list']);
  });

  it('routes batch workflow actions to the correct endpoints', async () => {
    const client = buildClientStub();
    const api = createProductionApi(client);
    await api.productionBatches.start(7);
    await api.productionBatches.complete(7, { produced_quantity: 10 });
    await api.productionBatches.cancel(7);
    expect(client.calls).toEqual([
      { method: 'post', path: '/production-batches/7/start', rest: [undefined, undefined] },
      {
        method: 'post',
        path: '/production-batches/7/complete',
        rest: [{ produced_quantity: 10 }, undefined]
      },
      { method: 'post', path: '/production-batches/7/cancel', rest: [undefined, undefined] }
    ]);
  });

  it('routes addComponent and calculateCost to /packaging-configurations/:id subpaths', async () => {
    const client = buildClientStub();
    const api = createProductionApi(client);
    await api.packagingConfigurations.addComponent(4, {
      component_item_variant_id: 11,
      quantity_per_output: 1,
      unit_id: 2,
      component_role: 'package_bag',
      waste_percentage: 0
    });
    await api.packagingConfigurations.calculateCost(4, { warehouse_id: 6 });
    expect(client.calls).toEqual([
      {
        method: 'post',
        path: '/packaging-configurations/4/components',
        rest: [
          {
            component_item_variant_id: 11,
            quantity_per_output: 1,
            unit_id: 2,
            component_role: 'package_bag',
            waste_percentage: 0
          },
          undefined
        ]
      },
      {
        method: 'post',
        path: '/packaging-configurations/4/calculate-cost',
        rest: [{ warehouse_id: 6 }, undefined]
      }
    ]);
  });

  it('PATCHes /packaging-configuration-components/:id when components.update is called', async () => {
    const client = buildClientStub();
    const api = createProductionApi(client);
    await api.packagingComponents.update(15, { quantity_per_output: 2 });
    expect(client.calls[0]).toEqual({
      method: 'patch',
      path: '/packaging-configuration-components/15',
      rest: [{ quantity_per_output: 2 }, undefined]
    });
  });
});
