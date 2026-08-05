import { describe, expect, it } from 'vitest';
import { compatibleInnerPackagingItems, innerQuantityPerOuter } from './packaging.constants.js';

describe('packaging capacity helpers', () => {
  const outer = { id: 1, max_content_weight_kg: 6 };

  it('calculates a whole inner-package quantity from matching capacities', () => {
    expect(innerQuantityPerOuter(outer, { id: 2, max_content_weight_kg: 0.4 })).toBe(15);
  });

  it('only offers inner packages that exactly fill the outer capacity', () => {
    const candidates = compatibleInnerPackagingItems(outer, [
      { id: 2, max_content_weight_kg: 0.4 },
      { id: 3, max_content_weight_kg: 0.5 },
      { id: 4, max_content_weight_kg: 0.7 },
      { id: 5, max_content_weight_kg: 0 }
    ]);

    expect(candidates.map((item) => item.id)).toEqual([2, 3]);
  });
});
