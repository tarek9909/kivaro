const { query } = require('../../bootstrap/db');
const { MODULE_KEYS } = require('../superadmin/moduleCatalog');

const baseUserSelect = `
  SELECT
    u.id,
    u.store_id,
    u.role_id,
    u.full_name,
    u.username,
    u.email,
    u.phone,
    u.password_hash,
    u.status,
    u.last_login_at,
    u.deleted_at,
    u.created_at,
    u.updated_at,
    r.name AS role_name,
    r.display_name AS role_display_name,
    r.status AS role_status,
    s.name AS store_name,
    s.code AS store_code,
    s.slug AS store_slug,
    s.status AS store_status,
    s.currency_code AS store_currency_code
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN stores s ON s.id = u.store_id
`;

async function findUsersByLogin(login, storeCode = null) {
  const conditions = ['u.deleted_at IS NULL', '(u.username = ? OR u.email = ? OR u.phone = ?)'];
  const params = [login, login, login];

  if (storeCode) {
    conditions.push('(s.code = ? OR s.slug = ? OR u.store_id IS NULL)');
    params.push(storeCode, storeCode);
  }

  const rows = await query(
    `${baseUserSelect}
     WHERE ${conditions.join(' AND ')}
     ORDER BY u.store_id IS NULL DESC, u.id ASC`,
    params
  );

  return rows;
}

async function findUserByLogin(login, storeCode = null) {
  const rows = await findUsersByLogin(login, storeCode);
  return rows[0] || null;
}

async function findUserById(userId) {
  const rows = await query(
    `${baseUserSelect}
     WHERE u.id = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function getUserPermissionsByUserId(userId) {
  const rows = await query(
    `SELECT p.permission_key
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.id = ? AND u.deleted_at IS NULL
     ORDER BY p.permission_key`,
    [userId]
  );

  return rows.map((row) => row.permission_key);
}

async function getEnabledModulesByStoreId(storeId) {
  if (!storeId) {
    return [];
  }

  const rows = await query(
    `SELECT module_key, enabled
     FROM store_modules
     WHERE store_id = ?
     ORDER BY module_key`,
    [storeId]
  );

  const configured = new Map(rows.map((row) => [row.module_key, Boolean(row.enabled)]));
  return MODULE_KEYS.filter((moduleKey) =>
    configured.has(moduleKey) ? configured.get(moduleKey) : true
  );
}

async function findActiveSession({ userId, tokenHash }) {
  const rows = await query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at
     FROM user_sessions
     WHERE user_id = ?
       AND token_hash = ?
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [userId, tokenHash]
  );

  return rows[0] || null;
}

async function createSession(connection, session) {
  const { userId, tokenHash, ipAddress, userAgent, expiresAt } = session;

  await connection.execute(
    `INSERT INTO user_sessions (
      user_id,
      token_hash,
      ip_address,
      user_agent,
      expires_at
    ) VALUES (?, ?, ?, ?, ?)`,
    [userId, tokenHash, ipAddress, userAgent, expiresAt]
  );
}

async function revokeSession(connection, { userId, tokenHash }) {
  const [result] = await connection.execute(
    `UPDATE user_sessions
     SET revoked_at = NOW()
     WHERE user_id = ?
       AND token_hash = ?
       AND revoked_at IS NULL`,
    [userId, tokenHash]
  );

  return result.affectedRows;
}

async function updateLastLogin(connection, userId) {
  await connection.execute(
    `UPDATE users
     SET last_login_at = NOW()
     WHERE id = ?`,
    [userId]
  );
}

async function updateUserProfile(userId, data) {
  const fields = [];
  const params = [];

  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value === '' ? null : value);
    }
  }

  if (fields.length === 0) {
    return findUserById(userId);
  }

  await query(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = ? AND deleted_at IS NULL`,
    [...params, userId]
  );

  return findUserById(userId);
}

async function updatePasswordHash(userId, passwordHash) {
  await query(
    `UPDATE users
     SET password_hash = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [passwordHash, userId]
  );
}

module.exports = {
  createSession,
  findActiveSession,
  findUserById,
  findUserByLogin,
  findUsersByLogin,
  getEnabledModulesByStoreId,
  getUserPermissionsByUserId,
  revokeSession,
  updateLastLogin,
  updatePasswordHash,
  updateUserProfile
};
