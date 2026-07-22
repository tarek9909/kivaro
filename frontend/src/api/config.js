const DEFAULT_TIMEOUT_MS = 30000;

function isDevelopmentBuild() {
  return typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
}

// A local Vite session must use the local API. Pointing it at the deployed
// legacy API silently mixes incompatible item contracts and produces a
// misleading validation error.
const DEFAULT_API_BASE_URL = isDevelopmentBuild()
  ? 'http://localhost:3000/api'
  : 'https://api.kivaro.vip/api';

function readEnvValue(key, fallback) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }

  return fallback;
}

export const apiConfig = {
  baseUrl: readEnvValue('VITE_API_BASE_URL', DEFAULT_API_BASE_URL).replace(/\/+$/, ''),
  timeoutMs: Number(readEnvValue('VITE_API_TIMEOUT_MS', DEFAULT_TIMEOUT_MS))
};
