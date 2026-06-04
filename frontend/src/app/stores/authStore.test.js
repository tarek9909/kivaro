import { describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore.js';

describe('authStore module access', () => {
  it('treats an empty enabled_modules list as all modules enabled', () => {
    useAuthStore.setState({
      user: { permissions: ['users.view'], enabled_modules: [] }
    });

    expect(useAuthStore.getState().hasModule('users')).toBe(true);
    expect(useAuthStore.getState().hasModule('inventory.items')).toBe(true);
  });

  it('requires both parent and feature keys when modules are explicit', () => {
    useAuthStore.setState({
      user: { permissions: ['inventory.view'], enabled_modules: ['inventory'] }
    });

    expect(useAuthStore.getState().hasModule('inventory')).toBe(true);
    expect(useAuthStore.getState().hasModule('inventory.items')).toBe(false);
  });
});
