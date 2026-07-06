const bcrypt = require('bcryptjs');
const ApiError = require('../../utils/ApiError');
const auditService = require('../../services/audit.service');
const authService = require('../auth/auth.service');
const { getPagination, getPaginationMeta } = require('../../utils/pagination');
const { slugify } = require('../../utils/slug');
const { withTransaction } = require('../../utils/transaction');
const storeConfigService = require('../../services/storeConfig.service');
const { MODULE_CATALOG, MODULE_KEYS } = require('./moduleCatalog');
const model = require('./superadmin.model');

function normalizeModuleRows(rows = []) {
  const byKey = new Map(rows.map((row) => [row.module_key, Boolean(row.enabled)]));
  return MODULE_CATALOG.map((module) => ({
    ...module,
    enabled: byKey.has(module.key) ? byKey.get(module.key) : true
  }));
}

function listModuleCatalog() {
  return normalizeModuleRows([]);
}

async function makeUniqueStoreSlug(data) {
  const explicitSlug = data.slug ? slugify(data.slug) : null;
  const base = explicitSlug || slugify(data.code || data.name);

  if (!base) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'slug', message: 'Store slug could not be generated' }
    ]);
  }

  if (explicitSlug) {
    const existing = await model.findStoreBySlug(explicitSlug);
    if (existing) {
      throw ApiError.conflict('Store slug already exists');
    }
    return explicitSlug;
  }

  let candidate = base;
  let suffix = 2;
  while (await model.findStoreBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function listStores(query) {
  const pagination = getPagination(query);
  const { rows, total } = await model.listStores({
    filters: {
      search: query.search,
      status: query.status
    },
    pagination
  });

  return {
    stores: rows,
    meta: getPaginationMeta({ ...pagination, total })
  };
}

async function getStore(id) {
  const store = await model.findStoreById(id);
  if (!store) {
    throw ApiError.notFound('Store not found');
  }

  const [modules, summary, vat] = await Promise.all([
    model.listStoreModules(id),
    model.getStoreSummary(id),
    storeConfigService.getStoreVatSettings(id)
  ]);

  return {
    ...store,
    vat,
    modules: normalizeModuleRows(modules),
    summary
  };
}

async function getStoreBySlug(slug) {
  const normalizedSlug = slugify(slug);
  const store = normalizedSlug ? await model.findStoreBySlug(normalizedSlug) : null;
  if (!store) {
    throw ApiError.notFound('Store not found');
  }

  const [modules, summary, vat] = await Promise.all([
    model.listStoreModules(store.id),
    model.getStoreSummary(store.id),
    storeConfigService.getStoreVatSettings(store.id)
  ]);

  return {
    ...store,
    vat,
    modules: normalizeModuleRows(modules),
    summary
  };
}

async function createStore(data) {
  const modules = MODULE_KEYS.map((moduleKey) => ({
    module_key: moduleKey,
    enabled: data.modules?.[moduleKey] !== false
  }));
  const vat = data.vat || { enabled: false, rate: 0 };
  const slug = await makeUniqueStoreSlug(data);

  const storeId = await withTransaction(async (connection) => {
    const nextStoreId = await model.createStore(connection, { ...data, slug });
    const { ownerRoleId } = await model.createDefaultStoreRoles(connection, nextStoreId);
    await model.replaceStoreModules(connection, nextStoreId, modules);
    await storeConfigService.setStoreVatSettings(nextStoreId, vat, { connection });

    if (!ownerRoleId) {
      throw ApiError.conflict('Owner role template is missing');
    }

    const passwordHash = await bcrypt.hash(data.owner.password, 12);
    await model.createStoreOwner(connection, {
      ...data.owner,
      store_id: nextStoreId,
      role_id: ownerRoleId,
      password_hash: passwordHash
    });

    return nextStoreId;
  });

  return getStore(storeId);
}

async function updateStore(id, data) {
  const currentStore = await getStore(id);

  const { vat, modules, ...storeData } = data;
  const moduleRows = modules
    ? MODULE_KEYS.map((moduleKey) => ({
        module_key: moduleKey,
        enabled: modules[moduleKey] !== false
      }))
    : null;

  if (modules) {
    const invalidKeys = Object.keys(modules).filter((key) => !MODULE_KEYS.includes(key));
    if (invalidKeys.length > 0) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'modules', message: `Unknown modules: ${invalidKeys.join(', ')}` }
      ]);
    }
  }

  if (storeData.slug !== undefined) {
    const normalizedSlug = slugify(storeData.slug);
    if (!normalizedSlug) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'slug', message: 'Store slug could not be generated' }
      ]);
    }
    if (normalizedSlug !== currentStore.slug) {
      const existing = await model.findStoreBySlug(normalizedSlug);
      if (existing && Number(existing.id) !== Number(id)) {
        throw ApiError.conflict('Store slug already exists');
      }
    }
    storeData.slug = normalizedSlug;
  }

  await withTransaction(async (connection) => {
    if (Object.keys(storeData).length > 0) {
      await model.updateStore(id, storeData, connection);
    }

    if (vat) {
      await storeConfigService.setStoreVatSettings(id, vat, { connection });
    }

    if (moduleRows) {
      await model.replaceStoreModules(connection, id, moduleRows);
    }
  });

  return getStore(id);
}

async function updateStoreStatus(id, status) {
  await getStore(id);
  return model.updateStore(id, { status });
}

async function listModules(id) {
  await getStore(id);
  const rows = await model.listStoreModules(id);
  return normalizeModuleRows(rows);
}

async function replaceModules(id, modules) {
  await getStore(id);
  const requested = new Map(modules.map((module) => [module.module_key, Boolean(module.enabled)]));
  const invalidKeys = [...requested.keys()].filter((key) => !MODULE_KEYS.includes(key));

  if (invalidKeys.length > 0) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'modules', message: `Unknown modules: ${invalidKeys.join(', ')}` }
    ]);
  }

  const normalized = MODULE_KEYS.map((moduleKey) => ({
    module_key: moduleKey,
    enabled: requested.has(moduleKey) ? requested.get(moduleKey) : true
  }));

  await withTransaction(async (connection) => {
    await model.replaceStoreModules(connection, id, normalized);
  });

  return listModules(id);
}

async function impersonateStore(id, actor = {}, context = {}) {
  const store = await getStore(id);

  if (store.status !== 'active') {
    throw ApiError.conflict('Only active stores can be entered');
  }

  const owner = await model.findActiveStoreOwner(id);

  if (!owner) {
    throw ApiError.conflict('Store has no active owner account');
  }

  const result = await authService.issueTokenForUser(owner.id, context);

  await auditService.logAudit(null, {
    userId: actor.id,
    storeId: store.id,
    module: 'superadmin',
    action: 'impersonate_store',
    tableName: 'stores',
    recordId: store.id,
    newValues: {
      impersonated_by_user_id: actor.id,
      target_store_id: store.id,
      target_user_id: owner.id
    },
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    description: `Superadmin entered store ${store.code || store.id} as ${owner.username || owner.email || owner.id}`
  });

  return {
    ...result,
    impersonation: {
      impersonated_by_user_id: actor.id,
      store: {
        id: store.id,
        name: store.name,
        code: store.code
      },
      user: {
        id: owner.id,
        full_name: owner.full_name,
        username: owner.username,
        email: owner.email
      }
    }
  };
}

module.exports = {
  createStore,
  getStore,
  getStoreBySlug,
  getPlatformSettings: storeConfigService.getPlatformSettings,
  impersonateStore,
  listModuleCatalog,
  listModules,
  listStores,
  replaceModules,
  updatePlatformSettings: storeConfigService.updatePlatformSettings,
  updateStore,
  updateStoreStatus
};
