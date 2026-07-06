const mockConnection = {
  execute: jest.fn()
};

jest.mock('../src/modules/auth/auth.model', () => ({
  createSession: jest.fn(),
  findActiveSession: jest.fn(),
  findUserById: jest.fn(),
  findUserByLogin: jest.fn(),
  findUsersByLogin: jest.fn(),
  getEnabledModulesByStoreId: jest.fn(),
  getUserPermissionsByUserId: jest.fn(),
  revokeSession: jest.fn(),
  updateLastLogin: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback(mockConnection))
}));

jest.mock('../src/services/storeConfig.service', () => ({
  getStoreUrlPrefix: jest.fn(),
  getStoreVatSettings: jest.fn()
}));

const bcrypt = require('bcryptjs');
const authModel = require('../src/modules/auth/auth.model');
const storeConfigService = require('../src/services/storeConfig.service');
const authService = require('../src/modules/auth/auth.service');

function activeUser(overrides = {}) {
  return {
    id: 1,
    role_id: 1,
    role_name: 'owner',
    role_display_name: 'System Owner',
    role_status: 'active',
    full_name: 'System Owner',
    username: 'owner',
    email: 'owner@example.com',
    phone: null,
    status: 'active',
    last_login_at: null,
    deleted_at: null,
    password_hash: '$2a$04$placeholder',
    ...overrides
  };
}

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeConfigService.getStoreUrlPrefix.mockResolvedValue('store');
    storeConfigService.getStoreVatSettings.mockResolvedValue({ enabled: false, rate: 0 });
  });

  test('logs in an active user and creates a session', async () => {
    const passwordHash = await bcrypt.hash('secret123', 4);
    const user = activeUser({ password_hash: passwordHash });

    authModel.findUsersByLogin.mockResolvedValue([user]);
    authModel.getUserPermissionsByUserId.mockResolvedValue([
      'dashboard.view',
      'users.view'
    ]);
    authModel.getEnabledModulesByStoreId.mockResolvedValue(['dashboard', 'users']);

    const result = await authService.login(
      {
        login: 'owner',
        password: 'secret123'
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'jest'
      }
    );

    expect(result.token_type).toBe('Bearer');
    expect(result.token).toEqual(expect.any(String));
    expect(result.user).toMatchObject({
      id: 1,
      username: 'owner',
      workspace_url_prefix: 'store',
      permissions: ['dashboard.view', 'users.view']
    });
    expect(authModel.createSession).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({
        userId: 1,
        tokenHash: expect.any(String),
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        expiresAt: expect.any(Date)
      })
    );
    expect(authModel.updateLastLogin).toHaveBeenCalledWith(mockConnection, 1);
  });

  test('includes store VAT and configured workspace prefix', async () => {
    const passwordHash = await bcrypt.hash('secret123', 4);
    const user = activeUser({
      password_hash: passwordHash,
      store_id: 4,
      store_name: 'Branch',
      store_code: 'BR',
      store_slug: 'branch',
      store_status: 'active',
      store_currency_code: 'USD'
    });
    storeConfigService.getStoreUrlPrefix.mockResolvedValue('branch');
    storeConfigService.getStoreVatSettings.mockResolvedValue({ enabled: true, rate: 11 });
    authModel.findUsersByLogin.mockResolvedValue([user]);
    authModel.getUserPermissionsByUserId.mockResolvedValue(['dashboard.view']);
    authModel.getEnabledModulesByStoreId.mockResolvedValue(['dashboard']);

    const result = await authService.login({ login: 'owner', password: 'secret123' });

    expect(result.user.workspace_url_prefix).toBe('branch');
    expect(result.user.store).toMatchObject({
      slug: 'branch',
      vat: { enabled: true, rate: 11 }
    });
  });

  test('rejects invalid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    authModel.findUsersByLogin.mockResolvedValue([
      activeUser({ password_hash: passwordHash })
    ]);

    await expect(
      authService.login({
        login: 'owner',
        password: 'wrong-password'
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid login credentials'
    });

    expect(authModel.createSession).not.toHaveBeenCalled();
  });

  test('rejects inactive users', async () => {
    authModel.findUsersByLogin.mockResolvedValue([
      activeUser({ status: 'inactive' })
    ]);

    await expect(
      authService.login({
        login: 'owner',
        password: 'secret123'
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'User account is not active'
    });
  });

  test('requires a store code when a store-local login is ambiguous', async () => {
    authModel.findUsersByLogin.mockResolvedValue([
      activeUser({ id: 2, store_id: 1, username: 'owner' }),
      activeUser({ id: 3, store_id: 2, username: 'owner' })
    ]);

    await expect(
      authService.login({
        login: 'owner',
        password: 'secret123'
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Validation failed'
    });

    expect(authModel.createSession).not.toHaveBeenCalled();
  });
});
