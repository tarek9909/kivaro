export function formatNumber(value, options = {}) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '-';
  return new Intl.NumberFormat(undefined, options).format(numeric);
}

export function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '-';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(numeric);
}

export function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}

export function initials(name) {
  if (!name) return '?';
  const trimmed = String(name).trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}
