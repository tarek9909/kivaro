import { create } from 'zustand';
import { api, tokenStorage } from '@/api/index.js';

const initialUser = tokenStorage.getStoredUser();
const initialToken = tokenStorage.getAccessToken();
const initialImpersonation = tokenStorage.getImpersonationSession();

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  token: initialToken,
  status: initialToken ? 'idle' : 'unauthenticated',
  hydrating: Boolean(initialToken),
  impersonation: initialImpersonation?.impersonation || null,
  error: null,

  hasPermission(permission) {
    if (!permission) return true;
    const permissions = get().user?.permissions ?? [];
    if (!Array.isArray(permissions)) return false;
    if (permissions.includes('*') || permissions.includes('all')) return true;
    return permissions.includes(permission);
  },

  hasAnyPermission(list = []) {
    if (!list || list.length === 0) return true;
    return list.some((perm) => get().hasPermission(perm));
  },

  hasModule(moduleKey) {
    if (!moduleKey) return true;
    const user = get().user;
    if (user?.is_superadmin) return true;
    const enabledModules = user?.enabled_modules ?? [];
    if (!Array.isArray(enabledModules) || enabledModules.length === 0) return true;
    const parentKey = String(moduleKey).includes('.') ? String(moduleKey).split('.')[0] : null;
    return enabledModules.includes(moduleKey) && (!parentKey || enabledModules.includes(parentKey));
  },

  async login(credentials) {
    set({ status: 'authenticating', error: null });
    try {
      const response = await api.auth.login(credentials);
      const data = response?.data ?? {};
      set({
        user: data.user ?? null,
        token: data.token ?? null,
        status: data.user ? 'authenticated' : 'unauthenticated',
        hydrating: false,
        impersonation: null,
        error: null
      });
      return data;
    } catch (error) {
      tokenStorage.clearSession();
      set({
        user: null,
        token: null,
        status: 'unauthenticated',
        hydrating: false,
        impersonation: null,
        error
      });
      throw error;
    }
  },

  async hydrate() {
    if (!tokenStorage.getAccessToken()) {
      set({
        status: 'unauthenticated',
        user: null,
        token: null,
        hydrating: false,
        impersonation: null
      });
      return null;
    }
    set({ hydrating: true });
    try {
      const response = await api.auth.me();
      const user = response?.data?.user ?? null;
      tokenStorage.setStoredUser(user);
      set({
        user,
        token: tokenStorage.getAccessToken(),
        status: user ? 'authenticated' : 'unauthenticated',
        hydrating: false,
        impersonation: tokenStorage.getImpersonationSession()?.impersonation || null,
        error: null
      });
      return user;
    } catch (error) {
      tokenStorage.clearSession();
      set({
        user: null,
        token: null,
        status: 'unauthenticated',
        hydrating: false,
        impersonation: null,
        error
      });
      return null;
    }
  },

  async logout() {
    try {
      await api.auth.logout();
    } catch {
      // session is cleared in finally regardless
    } finally {
      tokenStorage.clearSession();
      set({
        user: null,
        token: null,
        status: 'unauthenticated',
        hydrating: false,
        impersonation: null,
        error: null
      });
    }
  },

  async refreshUser() {
    const response = await api.auth.me();
    const user = response?.data?.user ?? null;
    tokenStorage.setStoredUser(user);
    set({
      user,
      token: tokenStorage.getAccessToken(),
      status: user ? 'authenticated' : 'unauthenticated',
      hydrating: false,
      error: null
    });
    return user;
  },

  applySession(data, impersonation = null) {
    tokenStorage.setAccessToken(data?.token || null);
    tokenStorage.setStoredUser(data?.user || null);
    set({
      user: data?.user || null,
      token: data?.token || null,
      status: data?.user ? 'authenticated' : 'unauthenticated',
      hydrating: false,
      impersonation,
      error: null
    });
  },

  startImpersonation(data) {
    const current = {
      token: get().token,
      user: get().user,
      impersonation: data?.impersonation || null
    };
    tokenStorage.setImpersonationSession(current);
    get().applySession(data, data?.impersonation || null);
  },

  exitImpersonation() {
    const original = tokenStorage.getImpersonationSession();
    if (!original?.token || !original?.user) return false;
    tokenStorage.clearImpersonationSession();
    tokenStorage.setAccessToken(original.token);
    tokenStorage.setStoredUser(original.user);
    set({
      user: original.user,
      token: original.token,
      status: 'authenticated',
      hydrating: false,
      impersonation: null,
      error: null
    });
    return true;
  }
}));
