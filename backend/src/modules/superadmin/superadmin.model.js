const { query } = require('../../bootstrap/db');

const STORE_COLUMNS = `
  id, name, code, slug, status, contact_name, phone, email, address, currency_code, notes, created_at, updated_at
`;

async function listStores({ filters, pagination }) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push('(name LIKE ? OR code LIKE ? OR slug LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(term, term, term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRows = await query(`SELECT COUNT(*) AS total FROM stores ${whereClause}`, params);
  const rows = await query(
    `SELECT ${STORE_COLUMNS}
     FROM stores
     ${whereClause}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.limit, pagination.offset]
  );

  return { rows, total: Number(countRows[0].total) };
}

async function findStoreById(id) {
  const rows = await query(
    `SELECT ${STORE_COLUMNS}
     FROM stores
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findStoreBySlug(slug) {
  const rows = await query(
    `SELECT ${STORE_COLUMNS}
     FROM stores
     WHERE slug = ?
     LIMIT 1`,
    [slug]
  );

  return rows[0] || null;
}

async function createStore(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO stores (
      name, code, slug, status, contact_name, phone, email, address, currency_code, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.code,
      data.slug,
      data.status || 'active',
      data.contact_name || null,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.currency_code || 'USD',
      data.notes || null
    ]
  );

  return result.insertId;
}

async function updateStore(id, data, connection = null) {
  const fields = [];
  const params = [];

  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value === '' ? null : value);
    }
  }

  if (fields.length > 0) {
    const sql =
      `UPDATE stores
       SET ${fields.join(', ')}
       WHERE id = ?`;
    if (connection) {
      await connection.execute(sql, [...params, id]);
    } else {
      await query(sql, [...params, id]);
    }
  }

  return findStoreById(id);
}

async function replaceStoreModules(connection, storeId, modules) {
  await connection.execute('DELETE FROM store_modules WHERE store_id = ?', [storeId]);

  if (modules.length === 0) {
    return;
  }

  const placeholders = modules.map(() => '(?, ?, ?)').join(', ');
  const params = modules.flatMap((module) => [storeId, module.module_key, module.enabled ? 1 : 0]);

  await connection.execute(
    `INSERT INTO store_modules (store_id, module_key, enabled)
     VALUES ${placeholders}`,
    params
  );
}

async function listStoreModules(storeId) {
  return query(
    `SELECT store_id, module_key, enabled, updated_at
     FROM store_modules
     WHERE store_id = ?
     ORDER BY module_key`,
    [storeId]
  );
}

async function getStoreVatSettings(storeId) {
  const rows = await query(
    `SELECT setting_key, setting_value
     FROM system_settings
     WHERE store_id = ?
       AND setting_key IN ('sales.vat.enabled', 'sales.vat.rate')`,
    [storeId]
  );
  const values = new Map(rows.map((row) => [row.setting_key, row.setting_value]));

  return {
    enabled: values.get('sales.vat.enabled') === 'true',
    rate: Number(values.get('sales.vat.rate') || 0)
  };
}

async function createStoreOwner(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO users (
      store_id, role_id, full_name, username, email, phone, password_hash, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      data.store_id,
      data.role_id,
      data.full_name,
      data.username || null,
      data.email || null,
      data.phone || null,
      data.password_hash
    ]
  );

  return result.insertId;
}

async function createDefaultStoreRoles(connection, storeId) {
  const [templateRoles] = await connection.execute(
    `SELECT id, name, display_name, description, is_system_role, status
     FROM roles
     WHERE store_id = 1
       AND name <> 'superadmin'
     ORDER BY id ASC`
  );

  const roleIdByName = new Map();

  for (const role of templateRoles) {
    const [result] = await connection.execute(
      `INSERT INTO roles (
        store_id, name, display_name, description, is_system_role, status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        storeId,
        role.name,
        role.display_name,
        role.description || null,
        role.is_system_role,
        role.status
      ]
    );
    const nextRoleId = result.insertId;
    roleIdByName.set(role.name, nextRoleId);

    const [permissions] = await connection.execute(
      `SELECT permission_id
       FROM role_permissions
       WHERE role_id = ?`,
      [role.id]
    );

    if (permissions.length > 0) {
      const placeholders = permissions.map(() => '(?, ?)').join(', ');
      const params = permissions.flatMap((permission) => [nextRoleId, permission.permission_id]);
      await connection.execute(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ${placeholders}`,
        params
      );
    }
  }

  return {
    ownerRoleId: roleIdByName.get('owner') || null,
    roleIdByName
  };
}

async function findActiveStoreOwner(storeId) {
  const rows = await query(
    `SELECT u.id, u.store_id, u.role_id, u.full_name, u.username, u.email, u.phone, u.status
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.store_id = ?
       AND u.deleted_at IS NULL
       AND u.status = 'active'
       AND r.name = 'owner'
       AND r.status = 'active'
     ORDER BY u.id ASC
     LIMIT 1`,
    [storeId]
  );

  return rows[0] || null;
}

async function upsertStoreSetting(connection, storeId, data) {
  await connection.execute(
    `INSERT INTO system_settings (
      store_id, setting_key, setting_value, value_type, description, updated_by
    ) VALUES (?, ?, ?, ?, ?, NULL)
    ON DUPLICATE KEY UPDATE
      setting_value = VALUES(setting_value),
      value_type = VALUES(value_type),
      description = VALUES(description)`,
    [
      storeId,
      data.setting_key,
      data.setting_value,
      data.value_type,
      data.description || null
    ]
  );
}

async function getStoreSummary(storeId) {
  const rows = await query(
    `SELECT
      (SELECT COUNT(*) FROM users WHERE store_id = ? AND deleted_at IS NULL) AS users_count,
      (SELECT COUNT(*) FROM warehouses WHERE store_id = ?) AS warehouses_count,
      (SELECT COUNT(*) FROM customers WHERE store_id = ?) AS customers_count,
      (SELECT COUNT(*) FROM items WHERE store_id = ?) AS items_count
    `,
    [storeId, storeId, storeId, storeId]
  );

  return rows[0] || {
    users_count: 0,
    warehouses_count: 0,
    customers_count: 0,
    items_count: 0
  };
}

module.exports = {
  createStore,
  createDefaultStoreRoles,
  createStoreOwner,
  findActiveStoreOwner,
  findStoreById,
  findStoreBySlug,
  getStoreSummary,
  getStoreVatSettings,
  listStoreModules,
  listStores,
  replaceStoreModules,
  upsertStoreSetting,
  updateStore
};
