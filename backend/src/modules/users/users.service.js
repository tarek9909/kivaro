const bcrypt = require('bcryptjs');
const ApiError = require('../../utils/ApiError');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { withTransaction } = require('../../utils/transaction');
const authModel = require('../auth/auth.model');
const locationModel = require('../locations/locations.model');
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

async function createUser(data, actor = {}, options = {}) {
  const targetStoreId = actor.is_superadmin ? (data.store_id ?? null) : actor.store_id;
  const role = await assertRoleAssignable(data.role_id, actor, targetStoreId);

  if (data.create_real_salesman || (role.name === 'salesman' && !options.allowSalesmanRole)) {
    throw ApiError.badRequest('Validation failed', [
      { field: data.create_real_salesman ? 'create_real_salesman' : 'role_id', message: 'Create salesmen from the Salesmen workflow so salary, commission, territory, and lifecycle data are complete' }
    ]);
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const userData = { ...data };
  delete userData.create_real_salesman;

  const createLinkedRecords = async (connection = null) => {
    const user = await userModel.createUser({
      ...userData,
      store_id: targetStoreId,
      password_hash: passwordHash
    }, connection);

    return user;
  };

  if (options.connection) {
    return createLinkedRecords(options.connection);
  }

  return createLinkedRecords();
}

async function createSalesmanUser(data, actor = {}, options = {}) {
  const targetStoreId = actor.is_superadmin ? (data.store_id ?? null) : actor.store_id;
  const role = await roleModel.findRoleByNameInStore('salesman', targetStoreId);

  if (!role || role.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [
      { field: 'create_login_user', message: 'Active salesman role does not exist' }
    ]);
  }

  return createUser({
    role_id: role.id,
    store_id: targetStoreId,
    full_name: data.full_name,
    username: data.username,
    email: data.email,
    phone: data.phone,
    password: data.password,
    status: data.status || 'active'
  }, actor, { ...options, allowSalesmanRole: true });
}

async function updateUser(id, data, actor = {}) {
  const current = await getUser(id, actor);

  const updateData = { ...data };

  let nextRole = null;
  if (updateData.role_id !== undefined) {
    nextRole = await assertRoleAssignable(updateData.role_id, actor, current.store_id ?? null);
    if (nextRole.name === 'salesman' && current.role_name !== 'salesman') {
      throw ApiError.badRequest('Validation failed', [
        { field: 'role_id', message: 'Assign the salesman role only through the Salesmen workflow' }
      ]);
    }
    if (current.role_name === 'salesman' && nextRole.name !== 'salesman') {
      throw ApiError.badRequest('Validation failed', [
        { field: 'role_id', message: 'Change a salesman account only through the Salesmen workflow so its employee record remains linked' }
      ]);
    }
  }

  if (updateData.password !== undefined) {
    updateData.password_hash = await bcrypt.hash(updateData.password, 12);
    delete updateData.password;
  }

  return withTransaction(async (connection) => {
    const salesman = await locationModel.findSalesmanByUserId(id, connection);
    if (updateData.status === 'inactive' && salesman?.status === 'active') {
      await locationModel.deactivateSalesman(salesman.id, { deactivatedBy: actor.id || null }, connection);
      await connection.execute(
        `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description, created_by)
         SELECT lt.store_id, lt.id, st.id, 'salesman_deactivated', ?, ?
         FROM salesman_targets st
         JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
         JOIN location_targets lt ON lt.id = slt.location_target_id
         WHERE st.salesman_id = ? AND st.status = 'active'
           AND NOT EXISTS (SELECT 1 FROM target_events te WHERE te.salesman_target_id = st.id AND te.event_type = 'salesman_deactivated')`,
        ['Salesman login was deactivated; collected-cash attribution and automatic commission are paused until the target is reassigned.', actor.id || null, salesman.id]
      );
      delete updateData.status;
    } else if (updateData.status === 'active' && salesman?.status === 'inactive') {
      await locationModel.reactivateSalesman(salesman.id, connection);
      delete updateData.status;
    }
    const user = await userModel.updateUser(id, updateData, connection);
    if (!user) throw ApiError.notFound('User not found');
    if (updateData.password_hash || updateData.role_id !== undefined || updateData.status !== undefined) {
      await authModel.revokeAllUserSessions(connection, id);
    }
    return user;
  });
}

async function updateUserStatus(id, status, actor = {}) {
  await getUser(id, actor);

  return updateUser(id, { status }, actor);
}

async function deleteUser(id, actor = {}) {
  await getUser(id, actor);
  await withTransaction(async (connection) => {
    const salesman = await locationModel.findSalesmanByUserId(id, connection);
    if (salesman?.status === 'active') {
      await locationModel.deactivateSalesman(salesman.id, { deactivatedBy: actor.id || null }, connection);
      await connection.execute(
        `INSERT INTO target_events (store_id, location_target_id, salesman_target_id, event_type, description, created_by)
         SELECT lt.store_id, lt.id, st.id, 'salesman_deactivated', ?, ?
         FROM salesman_targets st
         JOIN sublocation_targets slt ON slt.id = st.sublocation_target_id
         JOIN location_targets lt ON lt.id = slt.location_target_id
         WHERE st.salesman_id = ? AND st.status = 'active'
           AND NOT EXISTS (SELECT 1 FROM target_events te WHERE te.salesman_target_id = st.id AND te.event_type = 'salesman_deactivated')`,
        ['Salesman login was deleted; collected-cash attribution and automatic commission are paused until the target is reassigned.', actor.id || null, salesman.id]
      );
    }
    await authModel.revokeAllUserSessions(connection, id);
    const [result] = await connection.execute(
      `UPDATE users SET deleted_at = NOW(), status = 'inactive'
       WHERE id = ? AND deleted_at IS NULL`, [id]
    );
    if (!result.affectedRows) throw ApiError.notFound('User not found');
  });
}

module.exports = {
  createUser,
  createSalesmanUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
  updateUserStatus
};
