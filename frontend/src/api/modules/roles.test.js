import { describe, expect, it } from 'vitest';
import { createRolesApi } from './roles.js';

describe('roles API module', () => {
  it('sends permission pagination and filters as query parameters', async () => {
    const calls = [];
    const client = {
      get: (path, options) => {
        calls.push({ path, options });
        return Promise.resolve();
      }
    };
    const roles = createRolesApi(client);

    await roles.permissions.list({ page: 2, limit: 25, search: 'pos' });

    expect(calls).toEqual([
      {
        path: '/permissions',
        options: { params: { page: 2, limit: 25, search: 'pos' } }
      }
    ]);
  });
});
