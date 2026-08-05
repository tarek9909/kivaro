import { describe, expect, it } from 'vitest';
import { formatCartonStockSummary, formatStockQuantity, getEntryUnitLabel, getStockMode, getStockUnitLabel } from './stockUnits.js';

describe('stock unit formatting', () => {
  it('formats quantity units as whole pieces', () => {
    expect(formatStockQuantity('12.0000', {
      base_unit_type: 'quantity',
      base_unit_symbol: 'pc'
    })).toBe('12 pc');
  });

  it('formats weight units with decimal precision in kg', () => {
    expect(formatStockQuantity('12.3456', {
      base_unit_type: 'weight',
      base_unit_symbol: 'ton'
    })).toBe('12.3456 kg');
  });

  it('falls back to unit_symbol for stock balance view rows', () => {
    expect(getStockUnitLabel({ unit_symbol: 'kg' })).toBe('kg');
  });

  it('keeps the original selected unit for quantity entry', () => {
    expect(getEntryUnitLabel({
      base_unit_type: 'weight',
      base_unit_symbol: 'ton'
    })).toBe('ton');
  });

  it('shows carton stock with its total kilogram equivalent', () => {
    expect(formatCartonStockSummary('3', { kg_per_carton: '10' })).toBe('3 cartons · 30 kg total');
  });

  it('uses item stock modes over legacy unit metadata', () => {
    expect(getStockMode({ item_kind: 'packaging', stock_mode: 'piece' })).toBe('piece');
    expect(formatStockQuantity('12', {
      stock_mode: 'carton',
      base_unit_symbol: 'pc'
    })).toBe('12 cartons');
    expect(formatStockQuantity('12.5', {
      stock_mode: 'piece',
      base_unit_symbol: 'pc'
    })).toBe('13 pc');
  });
});
