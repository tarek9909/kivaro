const ApiError = require('../utils/ApiError');
const { getModuleByRequestPath } = require('../modules/superadmin/moduleCatalog');
const { isModuleEnabledForUser } = require('./permission.middleware');

function requireEnabledModule(req, res, next) {
  if (!req.user || req.user.is_superadmin) {
    return next();
  }

  const moduleConfig = getModuleByRequestPath(req.path);
  if (!moduleConfig) {
    return next();
  }

  if (!isModuleEnabledForUser(req.user, moduleConfig)) {
    return next(ApiError.forbidden('This workspace module is not enabled'));
  }

  return next();
}

module.exports = {
  requireEnabledModule
};
