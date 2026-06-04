const authService = require('./auth.service');
const { successResponse } = require('../../utils/response');

async function login(req, res) {
  const result = await authService.login(req.body, req.audit);

  return successResponse(res, {
    message: 'Login successful',
    data: result
  });
}

async function logout(req, res) {
  await authService.logout(req.user.id, req.token);

  return successResponse(res, {
    message: 'Logout successful',
    data: {}
  });
}

async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);

  return successResponse(res, {
    message: 'Current user fetched',
    data: {
      user
    }
  });
}

async function updateMe(req, res) {
  const user = await authService.updateCurrentUser(req.user.id, req.body);

  return successResponse(res, {
    message: 'Profile updated',
    data: {
      user
    }
  });
}

async function updatePassword(req, res) {
  await authService.updateCurrentUserPassword(req.user.id, req.body);

  return successResponse(res, {
    message: 'Password updated',
    data: {}
  });
}

module.exports = {
  login,
  logout,
  me,
  updateMe,
  updatePassword
};
