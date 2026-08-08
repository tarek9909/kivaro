import { describe, expect, it } from 'vitest';
import { buildLineFromOffer, lineTotal, positiveIntegerId, splitPromotionalLine } from './pos.utils.js';

it('positiveIntegerId rejects empty and invalid salesman values', () => {
  expect(positiveIntegerId('')).toBeNull();
  expect(positiveIntegerId('NaN')).toBeNull();
  expect(positiveIntegerId('7')).toBe(7);
});

const offer = {
  id: 7,
  display_name: 'Retail carton',
  entry_type: 'normal_carton',
  unit_label: 'carton',
  default_price: 20,
  vat_rate: 11
};

describe('Mini POS line helpers', () => {
  it('splits an offer into paid and free-gift quantities', () => {
    const line = { ...buildLineFromOffer(offer), quantity: '30' };
    const [saleLine, giftLine] = splitPromotionalLine(line, { giftQuantity: 5, paidUnitPrice: 15 });

    expect(saleLine).toEqual(expect.objectContaining({
      line_type: 'sale',
      quantity: '25',
      unit_price: 15,
      vat_rate: 11
    }));
    expect(giftLine).toEqual(expect.objectContaining({
      line_type: 'free_gift',
      quantity: '5',
      unit_price: 0,
      vat_rate: 0
    }));
    expect(lineTotal(saleLine)).toBeCloseTo(416.25);
    expect(lineTotal(giftLine)).toBe(0);
  });

  it('keeps the original price when applying Gift without an offer price', () => {
    const line = { ...buildLineFromOffer(offer), quantity: '10' };
    const [saleLine, giftLine] = splitPromotionalLine(line, {
      giftQuantity: 2,
      paidUnitPrice: line.unit_price
    });

    expect(saleLine.unit_price).toBe(20);
    expect(saleLine.quantity).toBe('8');
    expect(giftLine.quantity).toBe('2');
  });

  it('supports making the full quantity a gift', () => {
    const line = { ...buildLineFromOffer(offer), quantity: '4' };
    const lines = splitPromotionalLine(line, { giftQuantity: 4, paidUnitPrice: 15 });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual(expect.objectContaining({ line_type: 'free_gift', quantity: '4' }));
  });
});
