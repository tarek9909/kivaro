import { formatNumber } from '@/lib/formatters.js';

const INTEGER_UNIT_TYPES = new Set(['quantity']);

export function getStockMode(row = {}) {
  if (row.stock_mode) return row.stock_mode;
  if (row.item_kind === 'packaging') return 'piece';
  return (row.base_unit_type || row.unit_type) === 'weight' ? 'weight' : 'piece';
}

export function isPieceStock(row = {}) {
  return getStockMode(row) === 'piece';
}

export function getStockUnitLabel(row = {}) {
  const stockMode = getStockMode(row);
  if (stockMode === 'carton_weight' || stockMode === 'weight') {
    return 'kg';
  }
  if (stockMode === 'piece') {
    return row.stock_unit_symbol || row.base_unit_symbol || row.unit_symbol || 'pc';
  }
  const unitType = row.base_unit_type || row.unit_type;
  if (unitType === 'weight') {
    return 'kg';
  }
  return row.stock_unit_symbol || row.base_unit_symbol || row.unit_symbol || '';
}

export function getEntryUnitLabel(row = {}) {
  return row.base_unit_symbol || row.stock_unit_symbol || row.unit_symbol || '';
}

export function getStockQuantityFormat(row = {}) {
  const unitType = row.base_unit_type || row.unit_type;
  return isPieceStock(row) || INTEGER_UNIT_TYPES.has(unitType)
    ? { maximumFractionDigits: 0 }
    : { maximumFractionDigits: 4 };
}

export function formatStockQuantity(value, row = {}) {
  const unit = getStockUnitLabel(row);
  const formatted = formatNumber(value, getStockQuantityFormat(row));
  return unit ? `${formatted} ${unit}` : formatted;
}
