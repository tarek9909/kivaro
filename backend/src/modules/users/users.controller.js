const userService = require('./users.service');
const { successResponse } = require('../../utils/response');

async function listUsers(req, res) {
  const { users, meta } = await userService.listUsers(req.query, req.user);

  return successResponse(res, {
    message: 'Users fetched',
    data: {
      users
    },
    meta
  });
}

async function createUser(req, res) {
  const user = await userService.createUser(req.body, req.user);

  return successResponse(res, {
    statusCode: 201,
    message: 'User created',
    data: {
      user
    }
  });
}

async function getUser(req, res) {
  const user = await userService.getUser(req.params.id, req.user);

  return successResponse(res, {
    message: 'User fetched',
    data: {
      user
    }
  });
}

async function updateUser(req, res) {
  const user = await userService.updateUser(req.params.id, req.body, req.user);

  return successResponse(res, {
    message: 'User updated',
    data: {
      user
    }
  });
}

async function updateUserStatus(req, res) {
  const user = await userService.updateUserStatus(req.params.id, req.body.status, req.user);

  return successResponse(res, {
    message: 'User status updated',
    data: {
      user
    }
  });
}

async function deleteUser(req, res) {
  await userService.deleteUser(req.params.id, req.user);

  return successResponse(res, {
    message: 'User deleted',
    data: {}
  });
}

module.exports = {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
  updateUserStatus
};
