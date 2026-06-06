jest.mock('../src/modules/roles/roles.model', () => ({
  findRoleById: jest.fn(),
  findRoleByNameInStore: jest.fn(),
  getRolePermissions: jest.fn()
}));

jest.mock('../src/modules/locations/locations.model', () => ({
  createSalesman: jest.fn()
}));

jest.mock('../src/modules/users/users.model', () => ({
  createUser: jest.fn(),
  findUserById: jest.fn(),
  listUsers: jest.fn(),
  softDeleteUser: jest.fn(),
  updateUser: jest.fn(),
  updateUserStatus: jest.fn()
}));

const mockTransactionConnection = { execute: jest.fn() };

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn((callback) => callback(mockTransactionConnection))
}));

const roleModel = require('../src/modules/roles/roles.model');
const locationModel = require('../src/modules/locations/locations.model');
const userModel = require('../src/modules/users/users.model');
const service = require('../src/modules/users/users.service');

describe('users service role assignability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks store users from assigning roles with platform access', async () => {
    roleModel.findRoleById.mockResolvedValue({
      id: 1,
      name: 'superadmin',
      status: 'active'
    });
    roleModel.getRolePermissions.mockResolvedValue([
      { permission_key: 'superadmin.manage' }
    ]);

    await expect(
      service.createUser(
        {
          full_name: 'Branch Admin',
          username: 'branch_admin',
          email: 'branch@example.com',
          password: 'ChangeMe123!',
          role_id: 1,
          store_id: 1
        },
        { id: 9, store_id: 1, is_superadmin: false }
      )
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'You do not have permission to assign platform access'
    });

    expect(userModel.createUser).not.toHaveBeenCalled();
  });

  test('allows superadmins to assign platform roles', async () => {
    roleModel.findRoleById.mockResolvedValue({
      id: 1,
      name: 'superadmin',
      status: 'active'
    });
    userModel.createUser.mockResolvedValue({ id: 22, role_id: 1 });

    await service.createUser(
      {
        full_name: 'Platform User',
        username: 'platform',
        email: 'platform@example.com',
        password: 'ChangeMe123!',
        role_id: 1,
        store_id: null
      },
      { id: 1, is_superadmin: true }
    );

    expect(roleModel.getRolePermissions).not.toHaveBeenCalled();
    expect(userModel.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role_id: 1,
        store_id: null,
        password_hash: expect.any(String)
      }),
      null
    );
  });

  test('creates a linked salesman when requested for a salesman role', async () => {
    roleModel.findRoleById.mockResolvedValue({
      id: 5,
      store_id: 1,
      name: 'salesman',
      status: 'active'
    });
    roleModel.getRolePermissions.mockResolvedValue([]);
    userModel.createUser.mockResolvedValue({
      id: 42,
      role_id: 5,
      store_id: 1,
      full_name: 'Route Driver',
      phone: '+96170000000',
      email: 'driver@example.com',
      status: 'active'
    });
    locationModel.createSalesman.mockResolvedValue({ id: 8, user_id: 42 });

    await service.createUser(
      {
        full_name: 'Route Driver',
        email: 'driver@example.com',
        phone: '+96170000000',
        password: 'ChangeMe123!',
        role_id: 5,
        create_real_salesman: true
      },
      { id: 9, store_id: 1, is_superadmin: false }
    );

    expect(userModel.createUser).toHaveBeenCalledWith(expect.objectContaining({
      role_id: 5,
      store_id: 1,
      password_hash: expect.any(String)
    }), mockTransactionConnection);
    expect(locationModel.createSalesman).toHaveBeenCalledWith({
      store_id: 1,
      user_id: 42,
      full_name: 'Route Driver',
      phone: '+96170000000',
      email: 'driver@example.com',
      status: 'active'
    }, mockTransactionConnection);
  });

  test('rejects creating a real salesman for non-salesman roles', async () => {
    roleModel.findRoleById.mockResolvedValue({
      id: 2,
      store_id: 1,
      name: 'accountant',
      status: 'active'
    });
    roleModel.getRolePermissions.mockResolvedValue([]);

    await expect(service.createUser(
      {
        full_name: 'Account User',
        password: 'ChangeMe123!',
        role_id: 2,
        create_real_salesman: true
      },
      { id: 9, store_id: 1, is_superadmin: false }
    )).rejects.toMatchObject({
      statusCode: 400,
      errors: [
        { field: 'create_real_salesman', message: 'Only users with the salesman role can be added as salesmen' }
      ]
    });
    expect(userModel.createUser).not.toHaveBeenCalled();
    expect(locationModel.createSalesman).not.toHaveBeenCalled();
  });
});
