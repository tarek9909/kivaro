import { describe, expect, it } from 'vitest';
import { createSettingsApi } from './settings.js';

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
    patch: record('patch')
  };
}

describe('settings API module', () => {
  it('exposes companyProfile get and update methods', async () => {
    const client = buildClientStub();
    const api = createSettingsApi(client);

    await api.companyProfile.get();
    await api.companyProfile.update({ company_name: 'Test Corp' });

    expect(client.calls).toEqual([
      { method: 'get', path: '/company-profile', rest: [undefined] },
      {
        method: 'patch',
        path: '/company-profile',
        rest: [{ company_name: 'Test Corp' }, undefined]
      }
    ]);
  });

  it('exposes VAT settings get and update methods', async () => {
    const client = buildClientStub();
    const api = createSettingsApi(client);

    await api.vat.get();
    await api.vat.update({ enabled: true, rate: 10 });

    expect(client.calls).toEqual([
      { method: 'get', path: '/settings/vat', rest: [undefined] },
      {
        method: 'patch',
        path: '/settings/vat',
        rest: [{ enabled: true, rate: 10 }, undefined]
      }
    ]);
  });
});
