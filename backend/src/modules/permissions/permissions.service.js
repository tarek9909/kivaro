const permissionModel = require('./permissions.model');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');

async function listPermissions(actor = {}, query = {}) {
  const pagination = getPagination(query);
  const { rows, total } = await permissionModel.listPermissions({
    includePlatform: Boolean(actor.is_superadmin),
    filters: {
      search: query.search,
      module: query.module
    },
    pagination
  });

  return {
    permissions: rows,
    meta: getPaginationMeta({ ...pagination, total })
  };
}

module.exports = {
  listPermissions
};
