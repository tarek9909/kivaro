jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

const { query } = require('../src/bootstrap/db');
const service = require('../src/services/storeConfig.service');

describe('store config service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('updates global store URL prefix', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ insertId: 1 })
      .mockResolvedValueOnce([{ setting_value: 'branch' }]);

    const result = await service.updatePlatformSettings({ store_url_prefix: 'Branch' }, { id: 7 });

    expect(result).toEqual({ store_url_prefix: 'branch' });
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO system_settings'),
      [null, 'platform.store_url_prefix', 'branch', 'string', 'Global URL prefix for store workspaces', 7]
    );
  });

  test('rejects reserved store URL prefixes', async () => {
    await expect(
      service.updatePlatformSettings({ store_url_prefix: 'superadmin' }, { id: 7 })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Validation failed'
    });

    expect(query).not.toHaveBeenCalled();
  });

  test('reads store VAT settings', async () => {
    query
      .mockResolvedValueOnce([{ setting_value: 'true' }])
      .mockResolvedValueOnce([{ setting_value: '10' }]);

    await expect(service.getStoreVatSettings(4)).resolves.toEqual({ enabled: true, rate: 10 });
  });
});
