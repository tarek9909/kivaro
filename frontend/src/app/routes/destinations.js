import { flattenNavItems } from '@/app/navigation.js';

function hasPermission(user, permission) {
  if (!permission) return true;
  const permissions = user?.permissions ?? [];
  if (!Array.isArray(permissions)) return false;
  return permissions.includes('*') || permissions.includes('all') || permissions.includes(permission);
}

function hasAnyPermission(user, list = []) {
  if (!list || list.length === 0) return true;
  return list.some((permission) => hasPermission(user, permission));
}

function hasModule(user, moduleKey) {
  if (!moduleKey) return true;
  if (user?.is_superadmin) return true;
  const enabledModules = user?.enabled_modules ?? [];
  if (!Array.isArray(enabledModules) || enabledModules.length === 0) return true;
  const parentKey = String(moduleKey).includes('.') ? String(moduleKey).split('.')[0] : null;
  return enabledModules.includes(moduleKey) && (!parentKey || enabledModules.includes(parentKey));
}

function routeForItem(user, item) {
  if (item.id === 'dashboard') {
    return user?.store?.slug ? `/store/${user.store.slug}` : '/';
  }
  return item.to;
}

export function getDefaultAuthenticatedPath(user) {
  if (user?.is_superadmin) return '/superadmin';
  const firstAllowedItem = flattenNavItems().find((item) => (
    item.id !== 'superadmin' &&
    hasModule(user, item.moduleKey) &&
    hasAnyPermission(user, item.anyOfPermissions || (item.permission ? [item.permission] : []))
  ));

  return firstAllowedItem ? routeForItem(user, firstAllowedItem) : '/forbidden';
}
