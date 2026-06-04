const permissionService = require('./permissions.service');
const { successResponse } = require('../../utils/response');

async function listPermissions(req, res) {
  const { permissions, meta } = await permissionService.listPermissions(req.user, req.query);

  return successResponse(res, {
    message: 'Permissions fetched',
    data: {
      permissions
    },
    meta
  });
}

module.exports = {
  listPermissions
};
