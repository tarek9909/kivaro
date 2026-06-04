const ApiError = require('../utils/ApiError');
const authService = require('../modules/auth/auth.service');

function getBearerToken(req) {
  const header = req.get('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
}

async function authenticate(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return next(ApiError.unauthorized());
  }

  try {
    const authContext = await authService.verifyToken(token);

    req.token = token;
    req.user = authContext.user;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authenticate,
  getBearerToken
};
