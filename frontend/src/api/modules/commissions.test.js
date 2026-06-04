import { describe, expect, it } from 'vitest';
import { createCommissionsApi } from './commissions.js';

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

describe('commissions API module', () => {
  it('exposes only backend-supported rule methods', () => {
    const client = buildClientStub();
    const api = createCommissionsApi(client);
    expect(Object.keys(api.rules).sort()).toEqual([
      'create',
      'list',
      'remove',
      'update'
    ]);
  });

  it('exposes calculation list/get plus calculate/approve/pay (no update or remove)', () => {
    const client = buildClientStub();
    const api = createCommissionsApi(client);
    expect(Object.keys(api.calculations).sort()).toEqual([
      'approve',
      'calculate',
      'get',
      'list',
      'pay'
    ]);
  });

  it('routes calculation actions to the correct endpoints', async () => {
    const client = buildClientStub();
    const api = createCommissionsApi(client);
    await api.calculations.list({ status: 'draft' });
    await api.calculations.get(7);
    await api.calculations.calculate({ salesman_target_id: 12 });
    await api.calculations.approve(7);
    await api.calculations.pay(7, {
      payment_date: '2026-05-27',
      payment_method: 'cash'
    });
    expect(client.calls).toEqual([
      { method: 'get', path: '/commissions', rest: [{ params: { status: 'draft' } }] },
      { method: 'get', path: '/commissions/7', rest: [undefined] },
      {
        method: 'post',
        path: '/commissions/calculate',
        rest: [{ salesman_target_id: 12 }, undefined]
      },
      { method: 'post', path: '/commissions/7/approve', rest: [undefined, undefined] },
      {
        method: 'post',
        path: '/commissions/7/pay',
        rest: [{ payment_date: '2026-05-27', payment_method: 'cash' }, undefined]
      }
    ]);
  });

  it('PATCHes /commission-rules/:id with the supplied payload', async () => {
    const client = buildClientStub();
    const api = createCommissionsApi(client);
    await api.rules.update(3, { name: 'Q3 ramp', status: 'inactive' });
    expect(client.calls[0]).toEqual({
      method: 'patch',
      path: '/commission-rules/3',
      rest: [{ name: 'Q3 ramp', status: 'inactive' }, undefined]
    });
  });
});
