const ApiError = require('../../utils/ApiError');
const { resolveStoreId } = require('../../utils/storeScope');
const settingsModel = require('./settings.model');

const VAT_ENABLED_KEY = 'sales.vat.enabled';
const VAT_RATE_KEY = 'sales.vat.rate';

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

function parseBooleanSetting(setting, defaultValue = false) {
  if (!setting || setting.setting_value === null || setting.setting_value === undefined) {
    return defaultValue;
  }

  return setting.setting_value === true || setting.setting_value === 'true' || setting.setting_value === '1';
}

function parseNumberSetting(setting, defaultValue = 0) {
  if (!setting || setting.setting_value === null || setting.setting_value === undefined || setting.setting_value === '') {
    return defaultValue;
  }

  const number = Number(setting.setting_value);
  return Number.isNaN(number) ? defaultValue : number;
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
  const [enabledSetting, rateSetting] = await Promise.all([
    settingsModel.getSetting(VAT_ENABLED_KEY, storeId),
    settingsModel.getSetting(VAT_RATE_KEY, storeId)
  ]);

  return {
    enabled: parseBooleanSetting(enabledSetting, false),
    rate: parseNumberSetting(rateSetting, 0)
  };
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
  await settingsModel.upsertSetting({
    setting_key: VAT_ENABLED_KEY,
    setting_value: serializeSettingValue(enabled, 'boolean'),
    value_type: 'boolean',
    description: 'Enable VAT on new customer sale lines',
    updated_by: userId
  }, storeId);
  await settingsModel.upsertSetting({
    setting_key: VAT_RATE_KEY,
    setting_value: serializeSettingValue(rate, 'number'),
    value_type: 'number',
    description: 'VAT percentage applied to new customer sale lines',
    updated_by: userId
  }, storeId);

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
