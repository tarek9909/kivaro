import { describe, expect, it } from 'vitest';
import { buildStoreWorkspacePath, getDefaultAuthenticatedPath } from './destinations.js';

describe('authenticated destinations', () => {
  it('sends dashboard users to their store dashboard', () => {
    expect(getDefaultAuthenticatedPath({
      store: { slug: 'main' },
      permissions: ['dashboard.view'],
      enabled_modules: ['dashboard']
    })).toBe('/store/main');
  });

  it('uses configured workspace URL prefix for store dashboards', () => {
    const user = {
      workspace_url_prefix: 'branch',
      store: { slug: 'main' },
      permissions: ['dashboard.view'],
      enabled_modules: ['dashboard']
    };

    expect(buildStoreWorkspacePath(user)).toBe('/branch/main');
    expect(getDefaultAuthenticatedPath(user)).toBe('/branch/main');
  });

  it('skips dashboard when dashboard.view is missing', () => {
    expect(getDefaultAuthenticatedPath({
      store: { slug: 'main' },
      permissions: ['inventory.view'],
      enabled_modules: ['inventory']
    })).toBe('/inventory');
  });

  it('can default action-only workflow users to their module', () => {
    expect(getDefaultAuthenticatedPath({
      store: { slug: 'main' },
      permissions: ['dispatch.settle'],
      enabled_modules: ['dispatch']
    })).toBe('/dispatch');
  });
});
