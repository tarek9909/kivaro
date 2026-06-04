import { ApiError } from './ApiError.js';
import { apiConfig } from './config.js';
import { getAccessToken } from './tokenStorage.js';
import { buildQuery } from './query.js';

function joinUrl(baseUrl, path) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function isBlob(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isBodyless(method) {
  return ['GET', 'HEAD'].includes(method);
}

function normalizeHeaders(headers = {}, body) {
  const nextHeaders = new Headers(headers);
  const token = getAccessToken();

  if (token && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (body && !isFormData(body) && !isBlob(body) && !nextHeaders.has('Content-Type')) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  return nextHeaders;
}

function normalizeBody(body) {
  if (!body || isFormData(body) || isBlob(body) || typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
}

function isJsonResponse(response) {
  return response.headers.get('content-type')?.includes('application/json');
}

async function parseResponse(response, responseType) {
  if (response.status === 204) {
    return null;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  if (responseType === 'text') {
    return response.text();
  }

  if (isJsonResponse(response)) {
    return response.json();
  }

  return response.text();
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    params,
    headers,
    responseType = 'json',
    signal,
    timeoutMs = apiConfig.timeoutMs
  } = options;
  const controller = signal ? null : new AbortController();
  const timeout = controller
    ? globalThis.setTimeout(() => controller.abort(), timeoutMs)
    : null;
  const normalizedMethod = method.toUpperCase();
  const url = joinUrl(apiConfig.baseUrl, `${path}${buildQuery(params)}`);
  const response = await fetch(url, {
    method: normalizedMethod,
    headers: normalizeHeaders(headers, body),
    body: isBodyless(normalizedMethod) ? undefined : normalizeBody(body),
    signal: signal || controller?.signal
  }).finally(() => {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  });
  const parsed = await parseResponse(response, responseType);

  if (!response.ok) {
    throw new ApiError({
      message: parsed?.message || response.statusText || 'Request failed',
      status: response.status,
      errors: parsed?.errors || [],
      data: parsed,
      response
    });
  }

  return parsed;
}

export const httpClient = {
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  request
};
