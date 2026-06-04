import { ApiError } from '@/api/index.js';

/**
 * Resolve a human-readable error message from anything thrown by mutations or queries.
 * Also surfaces field-level validation errors when present.
 */
export function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  if (error instanceof ApiError) {
    if (Array.isArray(error.errors) && error.errors.length > 0) {
      const first = error.errors[0];
      if (first?.message) {
        return first.field ? `${first.field}: ${first.message}` : first.message;
      }
    }
    return error.message || fallback;
  }
  if (error.message) return error.message;
  return fallback;
}

/**
 * Map ApiError field-level errors into a { fieldName: message } object that forms can consume.
 */
export function mapFieldErrors(error) {
  if (!(error instanceof ApiError)) return {};
  if (!Array.isArray(error.errors)) return {};
  const out = {};
  for (const item of error.errors) {
    if (item?.field) out[item.field] = item.message || 'Invalid value.';
  }
  return out;
}
