jest.mock('../src/modules/roles/roles.model', () => ({
  findRoleById: jest.fn(),
  getRolePermissions: jest.fn()
}));

jest.mock('../src/modules/users/users.model', () => ({
  createUser: jest.fn(),
  findUserById: jest.fn(),
  listUsers: jest.fn(),
  softDeleteUser: jest.fn(),
  updateUser: jest.fn(),
  updateUserStatus: jest.fn()
}));

const roleModel = require('../src/modules/roles/roles.model');
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
      })
    );
  });
});
