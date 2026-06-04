const { query } = require('../../bootstrap/db');

async function listRoles({ filters = {}, pagination }) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('r.status = ?');
    params.push(filters.status);
  }

  if (filters.store_id !== undefined) {
    conditions.push('r.store_id <=> ?');
    params.push(filters.store_id);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push('(r.name LIKE ? OR r.display_name LIKE ? OR r.description LIKE ?)');
    params.push(term, term, term);
  }

  if (filters.exclude_permission_key) {
    conditions.push(`NOT EXISTS (
      SELECT 1
      FROM role_permissions rp_filter
      JOIN permissions p_filter ON p_filter.id = rp_filter.permission_id
      WHERE rp_filter.role_id = r.id
        AND p_filter.permission_key = ?
    )`);
    params.push(filters.exclude_permission_key);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM roles r
     ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT
      r.id,
      r.store_id,
      r.name,
      r.display_name,
      r.description,
      r.is_system_role,
      r.status,
      r.created_at,
      r.updated_at,
      (
        SELECT COUNT(*)
        FROM role_permissions rp
        WHERE rp.role_id = r.id
      ) AS permission_count
     FROM roles r
     ${whereClause}
     ORDER BY r.name ASC`
      + (pagination ? '\n     LIMIT ? OFFSET ?' : ''),
    pagination ? [...params, pagination.limit, pagination.offset] : params
  );

  return {
    rows,
    total: Number(countRows[0].total)
  };
}

async function findRoleById(id) {
  const rows = await query(
    `SELECT id, store_id, name, display_name, description, is_system_role, status, created_at, updated_at
     FROM roles
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findRoleByNameInStore(name, storeId) {
  const rows = await query(
    `SELECT id, store_id, name, display_name, description, is_system_role, status, created_at, updated_at
     FROM roles
     WHERE name = ?
       AND store_id <=> ?
     LIMIT 1`,
    [name, storeId ?? null]
  );

  return rows[0] || null;
}

async function getRolePermissions(roleId) {
  return query(
    `SELECT p.id, p.module, p.action, p.permission_key, p.description
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = ?
     ORDER BY p.module, p.action, p.permission_key`,
    [roleId]
  );
}

async function createRole(data) {
  const result = await query(
    `INSERT INTO roles (store_id, name, display_name, description, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.store_id ?? null,
      data.name,
      data.display_name,
      data.description || null,
      data.status || 'active'
    ]
  );

  return findRoleById(result.insertId);
}

async function updateRole(id, data) {
  const fields = [];
  const params = [];

  for (const [column, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value === '' ? null : value);
    }
  }

  if (fields.length === 0) {
    return findRoleById(id);
  }

  await query(
    `UPDATE roles
     SET ${fields.join(', ')}
     WHERE id = ?`,
    [...params, id]
  );

  return findRoleById(id);
}

async function countUsersByRole(roleId) {
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE role_id = ? AND deleted_at IS NULL`,
    [roleId]
  );

  return Number(rows[0].total);
}

async function deleteRole(id) {
  const result = await query(
    `DELETE FROM roles
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
}

async function findPermissionsByIds(ids) {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');

  return query(
    `SELECT id, module, action, permission_key, description
     FROM permissions
     WHERE id IN (${placeholders})
     ORDER BY module, action, permission_key`,
    ids
  );
}

async function replaceRolePermissions(connection, roleId, permissionIds) {
  await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

  if (permissionIds.length === 0) {
    return;
  }

  const placeholders = permissionIds.map(() => '(?, ?)').join(', ');
  const params = permissionIds.flatMap((permissionId) => [roleId, permissionId]);

  await connection.execute(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES ${placeholders}`,
    params
  );
}

module.exports = {
  countUsersByRole,
  createRole,
  deleteRole,
  findPermissionsByIds,
  findRoleById,
  findRoleByNameInStore,
  getRolePermissions,
  listRoles,
  replaceRolePermissions,
  updateRole
};
