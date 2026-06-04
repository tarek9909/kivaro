const roleService = require('./roles.service');
const { successResponse } = require('../../utils/response');

async function listRoles(req, res) {
  const { roles, meta } = await roleService.listRoles(req.query, req.user);

  return successResponse(res, {
    message: 'Roles fetched',
    data: {
      roles
    },
    meta
  });
}

async function createRole(req, res) {
  const role = await roleService.createRole(req.body, req.user);

  return successResponse(res, {
    statusCode: 201,
    message: 'Role created',
    data: {
      role
    }
  });
}

async function getRole(req, res) {
  const role = await roleService.getRole(req.params.id, req.user);

  return successResponse(res, {
    message: 'Role fetched',
    data: {
      role
    }
  });
}

async function updateRole(req, res) {
  const role = await roleService.updateRole(req.params.id, req.body, req.user);

  return successResponse(res, {
    message: 'Role updated',
    data: {
      role
    }
  });
}

async function deleteRole(req, res) {
  await roleService.deleteRole(req.params.id, req.user);

  return successResponse(res, {
    message: 'Role deleted',
    data: {}
  });
}

async function replaceRolePermissions(req, res) {
  const role = await roleService.replaceRolePermissions(
    req.params.id,
    req.body.permission_ids,
    req.user
  );

  return successResponse(res, {
    message: 'Role permissions updated',
    data: {
      role
    }
  });
}

module.exports = {
  createRole,
  deleteRole,
  getRole,
  listRoles,
  replaceRolePermissions,
  updateRole
};
