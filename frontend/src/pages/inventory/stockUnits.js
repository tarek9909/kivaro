import { formatNumber } from '@/lib/formatters.js';

const INTEGER_UNIT_TYPES = new Set(['quantity']);

export function getStockUnitLabel(row = {}) {
  const unitType = row.base_unit_type || row.unit_type;
  if (unitType === 'weight') {
    return 'kg';
  }
  return row.base_unit_symbol || row.unit_symbol || '';
}

export function getEntryUnitLabel(row = {}) {
  return row.base_unit_symbol || row.unit_symbol || '';
}

export function getStockQuantityFormat(row = {}) {
  const unitType = row.base_unit_type || row.unit_type;
  return INTEGER_UNIT_TYPES.has(unitType)
    ? { maximumFractionDigits: 0 }
    : { maximumFractionDigits: 4 };
}

export function formatStockQuantity(value, row = {}) {
  const unit = getStockUnitLabel(row);
  const formatted = formatNumber(value, getStockQuantityFormat(row));
  return unit ? `${formatted} ${unit}` : formatted;
}
