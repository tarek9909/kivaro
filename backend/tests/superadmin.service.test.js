const mockConnection = {
  execute: jest.fn()
};

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback(mockConnection))
}));

jest.mock('../src/modules/superadmin/superadmin.model', () => ({
  createDefaultStoreRoles: jest.fn(),
  createStore: jest.fn(),
  createStoreOwner: jest.fn(),
  findActiveStoreOwner: jest.fn(),
  findStoreById: jest.fn(),
  findStoreBySlug: jest.fn(),
  getStoreSummary: jest.fn(),
  getStoreVatSettings: jest.fn(),
  listStoreModules: jest.fn(),
  listStores: jest.fn(),
  replaceStoreModules: jest.fn(),
  upsertStoreSetting: jest.fn(),
  updateStore: jest.fn()
}));

jest.mock('../src/modules/auth/auth.service', () => ({
  issueTokenForUser: jest.fn()
}));

jest.mock('../src/services/audit.service', () => ({
  logAudit: jest.fn()
}));

const model = require('../src/modules/superadmin/superadmin.model');
const authService = require('../src/modules/auth/auth.service');
const auditService = require('../src/services/audit.service');
const service = require('../src/modules/superadmin/superadmin.service');

describe('superadmin service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a store with default module rows', async () => {
    model.createStore.mockResolvedValue(12);
    model.findStoreBySlug.mockResolvedValue(null);
    model.createDefaultStoreRoles.mockResolvedValue({ ownerRoleId: 112 });
    model.findStoreById.mockResolvedValue({
      id: 12,
      name: 'North',
      code: 'NORTH',
      status: 'active'
    });
    model.listStoreModules.mockResolvedValue([]);
    model.getStoreSummary.mockResolvedValue({});
    model.getStoreVatSettings.mockResolvedValue({ enabled: false, rate: 0 });

    const result = await service.createStore({
      name: 'North',
      code: 'NORTH',
      owner: {
        full_name: 'North Owner',
        username: 'north_owner',
        password: 'ChangeMe123!'
      },
      modules: {
        inventory: false
      }
    });

    expect(result.id).toBe(12);
    expect(model.createStore).toHaveBeenCalledWith(
      mockConnection,
      expect.objectContaining({ slug: 'north' })
    );
    expect(model.replaceStoreModules).toHaveBeenCalledWith(
      mockConnection,
      12,
      expect.arrayContaining([
        { module_key: 'inventory', enabled: false },
        { module_key: 'reports', enabled: true }
      ])
    );
    expect(model.upsertStoreSetting).toHaveBeenCalledWith(
      mockConnection,
      12,
      expect.objectContaining({
        setting_key: 'sales.vat.enabled',
        setting_value: 'false'
      })
    );
    expect(model.upsertStoreSetting).toHaveBeenCalledWith(
      mockConnection,
      12,
      expect.objectContaining({
        setting_key: 'sales.vat.rate',
        setting_value: '0'
      })
    );
  });

  test('creates a store with VAT settings enabled', async () => {
    model.createStore.mockResolvedValue(13);
    model.findStoreBySlug.mockResolvedValue(null);
    model.createDefaultStoreRoles.mockResolvedValue({ ownerRoleId: 113 });
    model.findStoreById.mockResolvedValue({
      id: 13,
      name: 'South',
      code: 'SOUTH',
      status: 'active'
    });
    model.listStoreModules.mockResolvedValue([]);
    model.getStoreSummary.mockResolvedValue({});
    model.getStoreVatSettings.mockResolvedValue({ enabled: true, rate: 11 });

    await service.createStore({
      name: 'South',
      code: 'SOUTH',
      owner: {
        full_name: 'South Owner',
        username: 'south_owner',
        password: 'ChangeMe123!'
      },
      vat: { enabled: true, rate: 11 }
    });

    expect(model.upsertStoreSetting).toHaveBeenCalledWith(
      mockConnection,
      13,
      expect.objectContaining({
        setting_key: 'sales.vat.enabled',
        setting_value: 'true'
      })
    );
    expect(model.upsertStoreSetting).toHaveBeenCalledWith(
      mockConnection,
      13,
      expect.objectContaining({
        setting_key: 'sales.vat.rate',
        setting_value: '11'
      })
    );
  });

  test('rejects duplicate explicit store slug', async () => {
    model.findStoreBySlug.mockResolvedValue({ id: 99, slug: 'north' });

    await expect(service.createStore({
      name: 'North',
      code: 'NORTH',
      slug: 'north',
      owner: {
        full_name: 'North Owner',
        username: 'north_owner',
        password: 'ChangeMe123!'
      }
    })).rejects.toMatchObject({
      statusCode: 409
    });

    expect(model.createStore).not.toHaveBeenCalled();
  });

  test('updates an existing store slug when it is unique', async () => {
    model.findStoreById
      .mockResolvedValueOnce({
        id: 4,
        name: 'Old Store',
        code: 'OLD',
        slug: 'old-store',
        status: 'active'
      })
      .mockResolvedValueOnce({
        id: 4,
        name: 'Old Store',
        code: 'OLD',
        slug: 'new-store',
        status: 'active'
      });
    model.listStoreModules.mockResolvedValue([]);
    model.getStoreSummary.mockResolvedValue({});
    model.getStoreVatSettings.mockResolvedValue({ enabled: false, rate: 0 });
    model.findStoreBySlug.mockResolvedValue(null);

    const result = await service.updateStore(4, { slug: 'New Store' });

    expect(model.updateStore).toHaveBeenCalledWith(4, { slug: 'new-store' }, mockConnection);
    expect(result.slug).toBe('new-store');
  });

  test('rejects unknown module keys when replacing modules', async () => {
    model.findStoreById.mockResolvedValue({
      id: 1,
      name: 'Default',
      code: 'DEFAULT',
      status: 'active'
    });
    model.listStoreModules.mockResolvedValue([]);
    model.getStoreSummary.mockResolvedValue({});
    model.getStoreVatSettings.mockResolvedValue({ enabled: false, rate: 0 });

    await expect(
      service.replaceModules(1, [{ module_key: 'unknown', enabled: true }])
    ).rejects.toMatchObject({
      statusCode: 400
    });
  });

  test('creates an audited impersonation token for an active store owner', async () => {
    model.findStoreById.mockResolvedValue({
      id: 2,
      name: 'Branch',
      code: 'BR',
      status: 'active'
    });
    model.listStoreModules.mockResolvedValue([]);
    model.getStoreSummary.mockResolvedValue({});
    model.getStoreVatSettings.mockResolvedValue({ enabled: false, rate: 0 });
    model.findActiveStoreOwner.mockResolvedValue({
      id: 9,
      full_name: 'Branch Owner',
      username: 'branch_owner',
      email: 'owner@example.com'
    });
    authService.issueTokenForUser.mockResolvedValue({
      token: 'owner-token',
      user: { id: 9 }
    });

    const result = await service.impersonateStore(
      2,
      { id: 1 },
      { ipAddress: '127.0.0.1', userAgent: 'jest' }
    );

    expect(result.token).toBe('owner-token');
    expect(authService.issueTokenForUser).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ ipAddress: '127.0.0.1' })
    );
    expect(auditService.logAudit).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        userId: 1,
        storeId: 2,
        action: 'impersonate_store'
      })
    );
  });
});
