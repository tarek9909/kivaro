jest.mock('../src/modules/settings/settings.model', () => ({
  getCompanyProfile: jest.fn(),
  createCompanyProfile: jest.fn(),
  updateCompanyProfile: jest.fn(),
  getSetting: jest.fn(),
  listSettings: jest.fn(),
  upsertSetting: jest.fn()
}));

const settingsModel = require('../src/modules/settings/settings.model');
const service = require('../src/modules/settings/settings.service');
const ApiError = require('../src/utils/ApiError');

describe('settings service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanyProfile', () => {
    test('calls getCompanyProfile with store_id from actor', async () => {
      settingsModel.getCompanyProfile.mockResolvedValue({ id: 1, company_name: 'Test Store' });

      const profile = await service.getCompanyProfile({ store_id: 42 });

      expect(settingsModel.getCompanyProfile).toHaveBeenCalledWith(42);
      expect(profile).toEqual({ id: 1, company_name: 'Test Store' });
    });

    test('calls getCompanyProfile with null if store_id not present', async () => {
      settingsModel.getCompanyProfile.mockResolvedValue(null);

      const profile = await service.getCompanyProfile({});

      expect(settingsModel.getCompanyProfile).toHaveBeenCalledWith(null);
      expect(profile).toBeNull();
    });
  });

  describe('updateCompanyProfile', () => {
    test('creates new profile if none exists', async () => {
      settingsModel.getCompanyProfile.mockResolvedValue(null);
      settingsModel.createCompanyProfile.mockResolvedValue({ id: 1, company_name: 'New Company' });

      const profile = await service.updateCompanyProfile(
        { company_name: 'New Company', phone: '123' },
        { store_id: 10 }
      );

      expect(settingsModel.getCompanyProfile).toHaveBeenCalledWith(10);
      expect(settingsModel.createCompanyProfile).toHaveBeenCalledWith(
        { company_name: 'New Company', phone: '123' },
        10
      );
      expect(profile).toEqual({ id: 1, company_name: 'New Company' });
    });

    test('throws error if company_name is missing when creating a new profile', async () => {
      settingsModel.getCompanyProfile.mockResolvedValue(null);

      await expect(
        service.updateCompanyProfile({ phone: '123' }, { store_id: 10 })
      ).rejects.toThrow(ApiError);

      expect(settingsModel.createCompanyProfile).not.toHaveBeenCalled();
    });

    test('updates existing profile if it already exists', async () => {
      settingsModel.getCompanyProfile.mockResolvedValue({ id: 1, company_name: 'Old Company' });
      settingsModel.updateCompanyProfile.mockResolvedValue({ id: 1, company_name: 'Updated Company' });

      const profile = await service.updateCompanyProfile(
        { company_name: 'Updated Company' },
        { store_id: 10 }
      );

      expect(settingsModel.getCompanyProfile).toHaveBeenCalledWith(10);
      expect(settingsModel.updateCompanyProfile).toHaveBeenCalledWith(
        1,
        { company_name: 'Updated Company' },
        10
      );
      expect(profile).toEqual({ id: 1, company_name: 'Updated Company' });
    });
  });
});
