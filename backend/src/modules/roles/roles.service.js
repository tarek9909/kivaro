const ApiError = require('../../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { withTransaction } = require('../../utils/transaction');
const roleModel = require('./roles.model');

async function getRole(id, actor = {}) {
  const role = await roleModel.findRoleById(id);

  if (!role) {
    throw ApiError.notFound('Role not found');
  }

  if (!actor.is_superadmin && Number(role.store_id) !== Number(actor.store_id)) {
    throw ApiError.notFound('Role not found');
  }

  const permissions = await roleModel.getRolePermissions(id);
  if (!actor.is_superadmin && permissions.some((permission) => permission.permission_key === 'superadmin.manage')) {
    throw ApiError.notFound('Role not found');
  }

  return {
    ...role,
    permissions
  };
}

async function listRoles(query = {}, actor = {}) {
  const pagination = getPagination(query);
  const { rows, total } = await roleModel.listRoles({
    filters: {
      search: query.search,
      status: query.status,
      store_id: actor.is_superadmin ? query.store_id : actor.store_id,
      exclude_permission_key: actor.is_superadmin ? undefined : 'superadmin.manage'
    },
    pagination
  });

  return {
    roles: rows,
    meta: getPaginationMeta({ ...pagination, total })
  };
}

async function createRole(data, actor = {}) {
  const storeId = actor.is_superadmin ? (data.store_id ?? null) : actor.store_id;

  if (!actor.is_superadmin && !storeId) {
    throw ApiError.forbidden('Store access is required');
  }

  const existing = await roleModel.findRoleByNameInStore(data.name, storeId);
  if (existing) {
    throw ApiError.conflict('Role name already exists in this store');
  }

  const { store_id, ...roleData } = data;
  return roleModel.createRole({ ...roleData, store_id: storeId });
}

async function updateRole(id, data, actor = {}) {
  const current = await getRole(id, actor);

  if (data.store_id !== undefined && Number(data.store_id) !== Number(current.store_id)) {
    throw ApiError.conflict('Roles cannot be moved between stores');
  }

  if (data.name && data.name !== current.name) {
    const existing = await roleModel.findRoleByNameInStore(data.name, current.store_id);
    if (existing && Number(existing.id) !== Number(id)) {
      throw ApiError.conflict('Role name already exists in this store');
    }
  }

  const { store_id, ...updates } = data;
  const role = await roleModel.updateRole(id, updates);

  if (!role) {
    throw ApiError.notFound('Role not found');
  }

  return role;
}

async function deleteRole(id, actor = {}) {
  const role = await getRole(id, actor);

  if (role.is_system_role) {
    throw ApiError.conflict('System roles cannot be deleted');
  }

  const userCount = await roleModel.countUsersByRole(id);

  if (userCount > 0) {
    throw ApiError.conflict('Role cannot be deleted while users are assigned to it');
  }

  await roleModel.deleteRole(id);
}

async function replaceRolePermissions(roleId, permissionIds, actor = {}) {
  await getRole(roleId, actor);

  const uniquePermissionIds = [...new Set(permissionIds)];
  const permissions = await roleModel.findPermissionsByIds(uniquePermissionIds);

  if (permissions.length !== uniquePermissionIds.length) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'permission_ids',
        message: 'One or more permissions do not exist'
      }
    ]);
  }

  if (!actor.is_superadmin && permissions.some((permission) => permission.permission_key === 'superadmin.manage')) {
    throw ApiError.forbidden('You do not have permission to assign platform access');
  }

  await withTransaction(async (connection) => {
    await roleModel.replaceRolePermissions(connection, roleId, uniquePermissionIds);
  });

  return getRole(roleId, actor);
}

module.exports = {
  createRole,
  deleteRole,
  getRole,
  listRoles,
  replaceRolePermissions,
  updateRole
};
