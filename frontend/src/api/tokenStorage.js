const ACCESS_TOKEN_KEY = 'kivaro_access_token';
const USER_KEY = 'kivaro_current_user';
const IMPERSONATION_KEY = 'kivaro_superadmin_session';

let memoryToken = null;
let memoryUser = null;

function hasStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getAccessToken() {
  if (hasStorage()) {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  return memoryToken;
}

export function setAccessToken(token) {
  memoryToken = token || null;

  if (!hasStorage()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getStoredUser() {
  const rawUser = hasStorage() ? window.localStorage.getItem(USER_KEY) : memoryUser;

  if (!rawUser) {
    return null;
  }

  if (typeof rawUser === 'object') {
    return rawUser;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  memoryUser = user || null;

  if (!hasStorage()) {
    return;
  }

  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_KEY);
  }
}

export function clearSession() {
  setAccessToken(null);
  setStoredUser(null);
  clearImpersonationSession();
}

export function getImpersonationSession() {
  const raw = hasStorage() ? window.localStorage.getItem(IMPERSONATION_KEY) : null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setImpersonationSession(session) {
  if (!hasStorage()) return;
  if (session) {
    window.localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(IMPERSONATION_KEY);
  }
}

export function clearImpersonationSession() {
  if (hasStorage()) {
    window.localStorage.removeItem(IMPERSONATION_KEY);
  }
}

export const tokenStorage = {
  clearSession,
  clearImpersonationSession,
  getAccessToken,
  getImpersonationSession,
  getStoredUser,
  setAccessToken,
  setImpersonationSession,
  setStoredUser
};
