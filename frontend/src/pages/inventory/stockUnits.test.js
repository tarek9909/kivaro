import { describe, expect, it } from 'vitest';
import { formatStockQuantity, getEntryUnitLabel, getStockUnitLabel } from './stockUnits.js';

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
});
