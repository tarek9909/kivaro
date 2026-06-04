const { query } = require('../../bootstrap/db');

async function getCompanyProfile(storeId = null) {
  const rows = await query(
    `SELECT id, company_name, phone, email, address, logo_url, currency_code, tax_number, created_at, updated_at
     FROM company_profiles
     WHERE store_id <=> ?
     ORDER BY id ASC
     LIMIT 1`,
    [storeId]
  );

  return rows[0] || null;
}

async function createCompanyProfile(data, storeId = null) {
  const result = await query(
    `INSERT INTO company_profiles (
      company_name,
      store_id,
      phone,
      email,
      address,
      logo_url,
      currency_code,
      tax_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.company_name,
      storeId,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.logo_url || null,
      data.currency_code || 'USD',
      data.tax_number || null
    ]
  );

  const rows = await query(
    `SELECT id, company_name, phone, email, address, logo_url, currency_code, tax_number, created_at, updated_at
     FROM company_profiles
     WHERE id = ?`,
    [result.insertId]
  );

  return rows[0] || null;
}

async function updateCompanyProfile(id, data, storeId = null) {
  const fields = [];
  const params = [];

  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value === '' ? null : value);
    }
  }

  if (fields.length > 0) {
    await query(
      `UPDATE company_profiles
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...params, id]
    );
  }

  return getCompanyProfile(storeId);
}

async function listSettings(storeId = null) {
  return query(
    `SELECT id, setting_key, setting_value, value_type, description, updated_by, created_at, updated_at
     FROM system_settings
     WHERE store_id <=> ?
     ORDER BY setting_key ASC`,
    [storeId]
  );
}

async function getSetting(settingKey, storeId = null) {
  const rows = await query(
    `SELECT id, setting_key, setting_value, value_type, description, updated_by, created_at, updated_at
     FROM system_settings
     WHERE setting_key = ? AND store_id <=> ?
     LIMIT 1`,
    [settingKey, storeId]
  );

  return rows[0] || null;
}

async function upsertSetting(data, storeId = null) {
  const existing = await getSetting(data.setting_key, storeId);

  if (existing) {
    await query(
      `UPDATE system_settings
       SET setting_value = ?,
         value_type = ?,
         description = ?,
         updated_by = ?
       WHERE id = ?`,
      [
        data.setting_value,
        data.value_type,
        data.description || null,
        data.updated_by || null,
        existing.id
      ]
    );
  } else {
    await query(
      `INSERT INTO system_settings (
        store_id,
        setting_key,
        setting_value,
        value_type,
        description,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        storeId,
        data.setting_key,
        data.setting_value,
        data.value_type,
        data.description || null,
        data.updated_by || null
      ]
    );
  }

  const rows = await query(
    `SELECT id, setting_key, setting_value, value_type, description, updated_by, created_at, updated_at
     FROM system_settings
     WHERE setting_key = ? AND store_id <=> ?
     LIMIT 1`,
    [
      data.setting_key,
      storeId
    ]
  );

  return rows[0] || null;
}

module.exports = {
  createCompanyProfile,
  getCompanyProfile,
  getSetting,
  listSettings,
  updateCompanyProfile,
  upsertSetting
};
