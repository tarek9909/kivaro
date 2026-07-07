const DEFAULT_API_BASE_URL = 'https://api.kivaro.vip/api';
const DEFAULT_TIMEOUT_MS = 30000;

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
