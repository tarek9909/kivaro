jest.mock('../src/modules/locations/locations.model', () => ({
  createSalesman: jest.fn(),
  createSalaryRate: jest.fn()
}));

jest.mock('../src/modules/users/users.service', () => ({
  createSalesmanUser: jest.fn()
}));

jest.mock('../src/modules/commissions/commissions.model', () => ({
  findRuleById: jest.fn()
}));

const mockTransactionConnection = { execute: jest.fn() };

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn((callback) => callback(mockTransactionConnection))
}));

const model = require('../src/modules/locations/locations.model');
const userService = require('../src/modules/users/users.service');
const commissionModel = require('../src/modules/commissions/commissions.model');
const service = require('../src/modules/locations/locations.service');
const { _private } = require('../src/modules/locations/locations.service');

describe('locations service target periods', () => {
  test('calculates applies-to dates from applies-from and target period', () => {
    expect(_private.calculatePeriodEnd('daily', '2026-06-04')).toBe('2026-06-04');
    expect(_private.calculatePeriodEnd('weekly', '2026-06-04')).toBe('2026-06-10');
    expect(_private.calculatePeriodEnd('monthly', '2026-06-04')).toBe('2026-07-03');
    expect(_private.calculatePeriodEnd('quarterly', '2026-06-04')).toBe('2026-09-03');
    expect(_private.calculatePeriodEnd('yearly', '2026-06-04')).toBe('2027-06-03');
  });

  test('handles end-of-month starts without overflowing', () => {
    expect(_private.calculatePeriodEnd('monthly', '2026-01-31')).toBe('2026-02-27');
  });

  test('accepts Date objects returned by the database', () => {
    expect(_private.calculatePeriodEnd('weekly', new Date('2026-06-04T00:00:00.000Z'))).toBe('2026-06-10');
  });
});

describe('locations service salesman user linking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    commissionModel.findRuleById.mockResolvedValue({ id: 3, store_id: 1, status: 'active' });
  });

  test('creates a salesman login user when requested', async () => {
    userService.createSalesmanUser.mockResolvedValue({ id: 44 });
    model.createSalesman.mockResolvedValue({ id: 7, user_id: 44, store_id: 1, base_salary: '500.0000' });

    await service.createSalesman({
      full_name: 'Route Driver',
      phone: '+96170000000',
      email: 'driver@example.com',
      password: 'ChangeMe123!',
      commission_rule_id: 3,
      status: 'active'
    }, 5, { id: 5, store_id: 1, is_superadmin: false });

    expect(userService.createSalesmanUser).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 1,
      full_name: 'Route Driver',
      phone: '+96170000000',
      email: 'driver@example.com',
      password: 'ChangeMe123!',
      status: 'active'
    }), { id: 5, store_id: 1, is_superadmin: false }, { connection: mockTransactionConnection });
    expect(model.createSalesman).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 1,
      user_id: 44,
      commission_rule_id: 3,
      full_name: 'Route Driver'
    }), mockTransactionConnection);
    expect(model.createSalaryRate).toHaveBeenCalledWith(mockTransactionConnection, expect.objectContaining({
      store_id: 1,
      salesman_id: 7,
      monthly_salary: '500.0000',
      created_by: 5
    }));
  });
});
