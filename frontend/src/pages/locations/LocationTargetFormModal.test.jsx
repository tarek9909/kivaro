import { describe, expect, it } from 'vitest';
import { calculateTargetPeriodEnd } from './LocationTargetFormModal.jsx';

describe('calculateTargetPeriodEnd', () => {
  it('calculates applies-to dates from period and applies-from date', () => {
    expect(calculateTargetPeriodEnd('daily', '2026-06-04')).toBe('2026-06-04');
    expect(calculateTargetPeriodEnd('weekly', '2026-06-04')).toBe('2026-06-10');
    expect(calculateTargetPeriodEnd('monthly', '2026-06-04')).toBe('2026-07-03');
    expect(calculateTargetPeriodEnd('quarterly', '2026-06-04')).toBe('2026-09-03');
    expect(calculateTargetPeriodEnd('yearly', '2026-06-04')).toBe('2027-06-03');
  });
});
