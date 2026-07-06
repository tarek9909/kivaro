const ApiError = require('../utils/ApiError');
const { query } = require('../bootstrap/db');
const { slugify } = require('../utils/slug');

const VAT_ENABLED_KEY = 'sales.vat.enabled';
const VAT_RATE_KEY = 'sales.vat.rate';
const STORE_URL_PREFIX_KEY = 'platform.store_url_prefix';
const DEFAULT_STORE_URL_PREFIX = 'store';

const RESERVED_PREFIXES = new Set([
  'accounting',
  'api',
  'audit-logs',
  'customers',
  'dispatch',
  'forbidden',
  'inventory',
  'locations',
  'login',
  'notifications',
  'packaging',
  'payments',
  'production',
  'profile',
  'purchases',
  'reports',
  'roles',
  'sales',
  'settings',
  'superadmin',
  'users'
]);

function getExecutor(connection) {
  return connection ? connection.execute.bind(connection) : query;
}

async function getSetting(settingKey, storeId = null, connection = null) {
  const execute = getExecutor(connection);
  const result = await execute(
    `SELECT id, setting_key, setting_value, value_type, description, updated_by, created_at, updated_at
     FROM system_settings
     WHERE setting_key = ? AND store_id <=> ?
     LIMIT 1`,
    [settingKey, storeId]
  );
  const rows = connection ? result[0] : result;

  return rows[0] || null;
}

async function upsertSetting({ settingKey, settingValue, valueType, description, updatedBy, storeId = null }, connection = null) {
  const existing = await getSetting(settingKey, storeId, connection);
  const execute = getExecutor(connection);

  if (existing) {
    await execute(
      `UPDATE system_settings
       SET setting_value = ?,
         value_type = ?,
         description = ?,
         updated_by = ?
       WHERE id = ?`,
      [settingValue, valueType, description || null, updatedBy || null, existing.id]
    );
    return;
  }

  await execute(
    `INSERT INTO system_settings (
      store_id, setting_key, setting_value, value_type, description, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [storeId, settingKey, settingValue, valueType, description || null, updatedBy || null]
  );
}

function parseBoolean(setting, fallback = false) {
  if (!setting || setting.setting_value === null || setting.setting_value === undefined) return fallback;
  return setting.setting_value === true || setting.setting_value === 'true' || setting.setting_value === '1';
}

function parseNumber(setting, fallback = 0) {
  if (!setting || setting.setting_value === null || setting.setting_value === undefined || setting.setting_value === '') return fallback;
  const number = Number(setting.setting_value);
  return Number.isNaN(number) ? fallback : number;
}

function validateVat(vat = {}) {
  const enabled = Boolean(vat.enabled);
  const rate = Number(vat.rate || 0);

  if (Number.isNaN(rate) || rate < 0 || rate > 100) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'vat.rate', message: 'VAT rate must be between 0 and 100' }
    ]);
  }

  if (enabled && rate <= 0) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'vat.rate', message: 'VAT rate is required when VAT is enabled' }
    ]);
  }

  return { enabled, rate };
}

async function getStoreVatSettings(storeId) {
  const [enabledSetting, rateSetting] = await Promise.all([
    getSetting(VAT_ENABLED_KEY, storeId),
    getSetting(VAT_RATE_KEY, storeId)
  ]);

  return {
    enabled: parseBoolean(enabledSetting, false),
    rate: parseNumber(rateSetting, 0)
  };
}

async function setStoreVatSettings(storeId, vat, options = {}) {
  const nextVat = validateVat(vat);
  await upsertSetting({
    storeId,
    settingKey: VAT_ENABLED_KEY,
    settingValue: nextVat.enabled ? 'true' : 'false',
    valueType: 'boolean',
    description: 'Enable VAT on new customer sale lines',
    updatedBy: options.updatedBy || null
  }, options.connection || null);
  await upsertSetting({
    storeId,
    settingKey: VAT_RATE_KEY,
    settingValue: String(nextVat.rate || 0),
    valueType: 'number',
    description: 'VAT percentage applied to new customer sale lines',
    updatedBy: options.updatedBy || null
  }, options.connection || null);

  return nextVat;
}

function normalizeStoreUrlPrefix(value) {
  const prefix = slugify(value || DEFAULT_STORE_URL_PREFIX);
  if (!prefix) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'store_url_prefix', message: 'Store URL prefix is required' }
    ]);
  }
  if (RESERVED_PREFIXES.has(prefix)) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'store_url_prefix', message: 'Store URL prefix conflicts with an app route' }
    ]);
  }
  return prefix;
}

async function getStoreUrlPrefix() {
  const setting = await getSetting(STORE_URL_PREFIX_KEY, null);
  return setting?.setting_value || DEFAULT_STORE_URL_PREFIX;
}

async function getPlatformSettings() {
  return {
    store_url_prefix: await getStoreUrlPrefix()
  };
}

async function updatePlatformSettings(data = {}, actor = {}) {
  const prefix = normalizeStoreUrlPrefix(data.store_url_prefix);
  await upsertSetting({
    settingKey: STORE_URL_PREFIX_KEY,
    settingValue: prefix,
    valueType: 'string',
    description: 'Global URL prefix for store workspaces',
    updatedBy: actor.id || null
  });
  return getPlatformSettings();
}

module.exports = {
  DEFAULT_STORE_URL_PREFIX,
  RESERVED_PREFIXES,
  STORE_URL_PREFIX_KEY,
  VAT_ENABLED_KEY,
  VAT_RATE_KEY,
  getPlatformSettings,
  getStoreUrlPrefix,
  getStoreVatSettings,
  normalizeStoreUrlPrefix,
  setStoreVatSettings,
  updatePlatformSettings,
  validateVat
};
