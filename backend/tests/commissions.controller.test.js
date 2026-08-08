jest.mock('../src/modules/commissions/commissions.service', () => ({
  listMonthlyPayroll: jest.fn()
}));

const service = require('../src/modules/commissions/commissions.service');
const controller = require('../src/modules/commissions/commissions.controller');

describe('commission payroll controller', () => {
  test('returns payroll rows at the response data boundary', async () => {
    service.listMonthlyPayroll.mockResolvedValue({
      period_month: '2026-08-01',
      payroll: [{ salesman_id: 7, salesman_name: 'Sam' }]
    });

    const response = {};
    response.status = jest.fn(() => response);
    response.json = jest.fn((body) => body);

    await controller.listPayroll({ query: { period_month: '2026-08-01' }, user: { id: 1 } }, response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: 'Monthly payroll fetched',
      data: {
        period_month: '2026-08-01',
        payroll: [{ salesman_id: 7, salesman_name: 'Sam' }]
      }
    });
  });
});
