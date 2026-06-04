const { query } = require('../../bootstrap/db');

async function listPermissions({ includePlatform = false, filters = {}, pagination } = {}) {
  const conditions = [];
  const params = [];

  if (!includePlatform) {
    conditions.push("permission_key <> 'superadmin.manage'");
  }

  if (filters.module) {
    conditions.push('module = ?');
    params.push(filters.module);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push('(permission_key LIKE ? OR module LIKE ? OR action LIKE ? OR description LIKE ?)');
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM permissions
     ${whereClause}`,
    params
  );
  const rows = await query(
    `SELECT id, module, action, permission_key, description, created_at
     FROM permissions
     ${whereClause}
     ORDER BY module, action, permission_key`
      + (pagination ? '\n     LIMIT ? OFFSET ?' : ''),
    pagination ? [...params, pagination.limit, pagination.offset] : params
  );

  return {
    rows,
    total: Number(countRows[0].total)
  };
}

module.exports = {
  listPermissions
};
