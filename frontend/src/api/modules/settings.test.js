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

  it('does not expose VAT settings methods to the normal settings API', () => {
    const api = createSettingsApi(buildClientStub());

    expect(api.vat).toBeUndefined();
  });
});
