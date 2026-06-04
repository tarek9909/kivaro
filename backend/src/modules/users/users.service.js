const bcrypt = require('bcryptjs');
const ApiError = require('../../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const roleModel = require('../roles/roles.model');
const userModel = require('./users.model');

async function assertRoleAssignable(roleId, actor = {}, targetStoreId = null) {
  const role = await roleModel.findRoleById(roleId);

  if (!role || role.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'role_id',
        message: 'Active role does not exist'
      }
    ]);
  }

  const roleStoreId = role.store_id ?? null;
  const normalizedTargetStoreId = targetStoreId ?? null;

  if (!actor.is_superadmin) {
    const permissions = await roleModel.getRolePermissions(roleId);
    if (permissions.some((permission) => permission.permission_key === 'superadmin.manage')) {
      throw ApiError.forbidden('You do not have permission to assign platform access');
    }

    if (Number(roleStoreId) !== Number(actor.store_id)) {
      throw ApiError.forbidden('You do not have permission to assign roles from another store');
    }
  } else if (roleStoreId !== normalizedTargetStoreId && Number(roleStoreId) !== Number(normalizedTargetStoreId)) {
    throw ApiError.badRequest('Validation failed', [
      {
        field: 'role_id',
        message: 'Role must belong to the selected store'
      }
    ]);
  }

  return role;
}

async function listUsers(query, actor = {}) {
  const pagination = getPagination(query);
  const filters = {
    search: query.search,
    status: query.status,
    role_id: query.role_id,
    store_id: actor.is_superadmin ? query.store_id : actor.store_id
  };

  const { rows, total } = await userModel.listUsers({ filters, pagination });

  return {
    users: rows,
    meta: getPaginationMeta({ ...pagination, total })
  };
}

async function getUser(id, actor = {}) {
  const user = await userModel.findUserById(id);

  if (!user || (!actor.is_superadmin && user.store_id !== actor.store_id)) {
    throw ApiError.notFound('User not found');
  }

  return user;
}

async function createUser(data, actor = {}) {
  const targetStoreId = actor.is_superadmin ? (data.store_id ?? null) : actor.store_id;
  await assertRoleAssignable(data.role_id, actor, targetStoreId);

  const passwordHash = await bcrypt.hash(data.password, 12);

  return userModel.createUser({
    ...data,
    store_id: targetStoreId,
    password_hash: passwordHash
  });
}

async function updateUser(id, data, actor = {}) {
  const current = await getUser(id, actor);

  const updateData = { ...data };

  if (updateData.role_id !== undefined) {
    await assertRoleAssignable(updateData.role_id, actor, current.store_id ?? null);
  }

  if (updateData.password !== undefined) {
    updateData.password_hash = await bcrypt.hash(updateData.password, 12);
    delete updateData.password;
  }

  const user = await userModel.updateUser(id, updateData);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
}

async function updateUserStatus(id, status, actor = {}) {
  await getUser(id, actor);

  const user = await userModel.updateUserStatus(id, status);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  return user;
}

async function deleteUser(id, actor = {}) {
  await getUser(id, actor);
  const affectedRows = await userModel.softDeleteUser(id);

  if (!affectedRows) {
    throw ApiError.notFound('User not found');
  }
}

module.exports = {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
  updateUserStatus
};
