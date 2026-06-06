const { query } = require('../../bootstrap/db');

const publicUserSelect = `
  SELECT
    u.id,
    u.store_id,
    u.role_id,
    r.name AS role_name,
    r.display_name AS role_display_name,
    u.full_name,
    u.username,
    u.email,
    u.phone,
    u.status,
    u.last_login_at,
    u.created_at,
    u.updated_at
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

function buildUserFilters(filters = {}) {
  const conditions = ['u.deleted_at IS NULL'];
  const params = [];

  if (filters.status) {
    conditions.push('u.status = ?');
    params.push(filters.status);
  }

  if (filters.role_id) {
    conditions.push('u.role_id = ?');
    params.push(filters.role_id);
  }

  if (filters.store_id !== undefined) {
    conditions.push('u.store_id <=> ?');
    params.push(filters.store_id);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      '(u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'
    );
    params.push(term, term, term, term);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

async function listUsers({ filters, pagination }) {
  const { whereClause, params } = buildUserFilters(filters);

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ${whereClause}`,
    params
  );

  const rows = await query(
    `${publicUserSelect}
     ${whereClause}
     ORDER BY u.created_at DESC, u.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pagination.limit, pagination.offset]
  );

  return {
    rows,
    total: Number(countRows[0].total)
  };
}

async function execute(connection, sql, params) {
  if (connection) {
    const [rows] = await connection.execute(sql, params);
    return rows;
  }

  return query(sql, params);
}

async function findUserById(id, connection = null) {
  const rows = await execute(
    connection,
    `${publicUserSelect}
     WHERE u.id = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function createUser(data, connection = null) {
  const result = await execute(
    connection,
    `INSERT INTO users (
      role_id,
      store_id,
      full_name,
      username,
      email,
      phone,
      password_hash,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.role_id,
      data.store_id || null,
      data.full_name,
      data.username || null,
      data.email || null,
      data.phone || null,
      data.password_hash,
      data.status || 'active'
    ]
  );

  return findUserById(result.insertId, connection);
}

async function updateUser(id, data) {
  const fields = [];
  const params = [];

  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value === '' ? null : value);
    }
  }

  if (fields.length === 0) {
    return findUserById(id);
  }

  await query(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = ? AND deleted_at IS NULL`,
    [...params, id]
  );

  return findUserById(id);
}

async function updateUserStatus(id, status) {
  await query(
    `UPDATE users
     SET status = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [status, id]
  );

  return findUserById(id);
}

async function softDeleteUser(id) {
  const result = await query(
    `UPDATE users
     SET deleted_at = NOW(), status = 'inactive'
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return result.affectedRows;
}

module.exports = {
  createUser,
  findUserById,
  listUsers,
  softDeleteUser,
  updateUser,
  updateUserStatus
};
