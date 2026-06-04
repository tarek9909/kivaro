const { calculateAmounts } = require('../src/modules/commissions/commissions.service');

const defaultRule = {
  below_target_rate: 5,
  at_target_rate: 10,
  above_target_extra_rate: 1
};

describe('commission calculation formula', () => {
  test('uses below-target rate when sales are under target', () => {
    expect(calculateAmounts(1000, 500, defaultRule)).toMatchObject({
      below_target_commission: '25.0000',
      target_commission: '0.0000',
      above_target_commission: '0.0000',
      total_commission: '25.0000'
    });
  });

  test('uses target rate when sales equal target', () => {
    expect(calculateAmounts(1000, 1000, defaultRule)).toMatchObject({
      below_target_commission: '0.0000',
      target_commission: '100.0000',
      above_target_commission: '0.0000',
      total_commission: '100.0000'
    });
  });

  test('uses target plus extra rate when sales exceed target', () => {
    expect(calculateAmounts(1000, 1500, defaultRule)).toMatchObject({
      below_target_commission: '0.0000',
      target_commission: '100.0000',
      above_target_commission: '5.0000',
      total_commission: '105.0000'
    });
  });
});
