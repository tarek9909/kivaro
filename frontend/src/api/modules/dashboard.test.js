import { describe, expect, it } from 'vitest';
import { createDashboardApi } from './dashboard.js';

describe('dashboard API module', () => {
  it('passes date filters as dashboard query params', async () => {
    const calls = [];
    const api = createDashboardApi({
      get: (path, options) => {
        calls.push({ path, options });
        return Promise.resolve();
      }
    });

    await api.get({ date_from: '2026-07-01', date_to: '2026-07-22' });

    expect(calls).toEqual([{
      path: '/dashboard',
      options: { params: { date_from: '2026-07-01', date_to: '2026-07-22' } }
    }]);
  });
});
