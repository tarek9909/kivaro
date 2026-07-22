import { describe, expect, it } from 'vitest';
import { createPosApi } from './pos.js';

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

describe('Mini POS API module', () => {
  it('uses the quantity-hidden catalogue and own-order endpoints', async () => {
    const client = buildClientStub();
    const pos = createPosApi(client);

    await pos.catalog.list({ warehouse_id: 7 });
    await pos.territories.list();
    await pos.customers.create({ name: 'New customer', location_id: 1, sublocation_id: 2 });
    await pos.orders.cancel(9, { notes: 'Customer unavailable' });
    await pos.workspace.get({ limit: 20 });
    await pos.review.prepareDispatch({ pos_order_ids: [9] });

    expect(client.calls).toEqual([
      { method: 'get', path: '/pos/catalog', rest: [{ params: { warehouse_id: 7 } }] },
      { method: 'get', path: '/pos/territories', rest: [{ params: undefined }] },
      {
        method: 'post',
        path: '/pos/customers',
        rest: [{ name: 'New customer', location_id: 1, sublocation_id: 2 }, undefined]
      },
      {
        method: 'post',
        path: '/pos/orders/9/cancel',
        rest: [{ notes: 'Customer unavailable' }, undefined]
      },
      {
        method: 'get',
        path: '/pos/workspace',
        rest: [{ params: { limit: 20 } }]
      },
      {
        method: 'post',
        path: '/pos/review/prepare-dispatch',
        rest: [{ pos_order_ids: [9] }, undefined]
      }
    ]);
  });
});
