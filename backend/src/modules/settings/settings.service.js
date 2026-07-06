const ApiError = require('../../utils/ApiError');
const storeConfigService = require('../../services/storeConfig.service');
const { resolveStoreId } = require('../../utils/storeScope');
const settingsModel = require('./settings.model');

function serializeSettingValue(value, valueType) {
  if (value === null || value === undefined) {
    return null;
  }

  if (valueType === 'json') {
    return JSON.stringify(value);
  }

  if (valueType === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

async function getCompanyProfile(actor = {}) {
  return settingsModel.getCompanyProfile(actor.store_id || null);
}

async function updateCompanyProfile(data, actor = {}) {
  const storeId = actor.store_id || null;
  const currentProfile = await settingsModel.getCompanyProfile(storeId);

  if (!currentProfile) {
    if (!data.company_name) {
      throw ApiError.badRequest('Validation failed', [
        {
          field: 'company_name',
          message: 'Company name is required when creating the company profile'
        }
      ]);
    }

    return settingsModel.createCompanyProfile(data, storeId);
  }

  return settingsModel.updateCompanyProfile(currentProfile.id, data, storeId);
}

async function listSettings(actor = {}) {
  return settingsModel.listSettings(actor.store_id || null);
}

async function getVatSettings(actor = {}) {
  const storeId = resolveStoreId(actor, actor.is_superadmin ? actor.query || {} : actor);
  return storeConfigService.getStoreVatSettings(storeId);
}

async function updateVatSettings(data, userId, actor = {}) {
  const enabled = Boolean(data.enabled);
  const rate = Number(data.rate ?? 0);

  if (Number.isNaN(rate) || rate < 0 || rate > 100) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'rate', message: 'VAT rate must be between 0 and 100' }
    ]);
  }

  if (enabled && rate <= 0) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'rate', message: 'VAT rate is required when VAT is enabled' }
    ]);
  }

  const storeId = resolveStoreId(actor, data, { requireForSuperadmin: true });
  await storeConfigService.setStoreVatSettings(storeId, { enabled, rate }, { updatedBy: userId });

  return getVatSettings({ ...actor, query: { store_id: storeId } });
}

async function updateSetting(settingKey, data, userId, actor = {}) {
  return settingsModel.upsertSetting({
    setting_key: settingKey,
    setting_value: serializeSettingValue(data.setting_value, data.value_type),
    value_type: data.value_type,
    description: data.description,
    updated_by: userId
  }, actor.store_id || null);
}

module.exports = {
  getVatSettings,
  getCompanyProfile,
  listSettings,
  updateCompanyProfile,
  updateVatSettings,
  updateSetting
};
