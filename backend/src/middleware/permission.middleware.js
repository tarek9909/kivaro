const ApiError = require('../utils/ApiError');
const { getModuleByRequestPath } = require('../modules/superadmin/moduleCatalog');

function getApiPath(req) {
  return (req.originalUrl || req.path || '').replace(/^\/api/, '').split('?')[0];
}

function isModuleEnabledForUser(user, moduleConfig) {
  if (!moduleConfig || user.is_superadmin) {
    return true;
  }

  const modules = user.enabled_modules;
  if (!Array.isArray(modules) || modules.length === 0) {
    return true;
  }

  const enabledModules = new Set(modules);
  return enabledModules.has(moduleConfig.key) &&
    (!moduleConfig.parentKey || enabledModules.has(moduleConfig.parentKey));
}

function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const moduleConfig = getModuleByRequestPath(getApiPath(req));
    if (!isModuleEnabledForUser(req.user, moduleConfig)) {
      return next(ApiError.forbidden('This workspace module is not enabled'));
    }

    const userPermissions = new Set(req.user.permissions || []);

    if (userPermissions.has('*')) {
      return next();
    }

    const missingPermissions = requiredPermissions.filter(
      (permission) => !userPermissions.has(permission)
    );

    if (missingPermissions.length > 0) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    return next();
  };
}

function requireAnyPermission(...acceptedPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const moduleConfig = getModuleByRequestPath(getApiPath(req));
    if (!isModuleEnabledForUser(req.user, moduleConfig)) {
      return next(ApiError.forbidden('This workspace module is not enabled'));
    }

    const userPermissions = new Set(req.user.permissions || []);

    if (userPermissions.has('*')) {
      return next();
    }

    if (!acceptedPermissions.some((permission) => userPermissions.has(permission))) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    return next();
  };
}

module.exports = {
  isModuleEnabledForUser,
  requireAnyPermission,
  requirePermission
};
