const service = require('./superadmin.service');
const { successResponse } = require('../../utils/response');

async function listStores(req, res) {
  const { stores, meta } = await service.listStores(req.query);
  return successResponse(res, {
    message: 'Stores fetched',
    data: { stores },
    meta
  });
}

async function listModuleCatalog(req, res) {
  const modules = service.listModuleCatalog();
  return successResponse(res, {
    message: 'Module catalog fetched',
    data: { modules }
  });
}

async function createStore(req, res) {
  const store = await service.createStore(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Store created',
    data: { store }
  });
}

async function getStore(req, res) {
  const store = await service.getStore(req.params.id);
  return successResponse(res, {
    message: 'Store fetched',
    data: { store }
  });
}

async function getStoreBySlug(req, res) {
  const store = await service.getStoreBySlug(req.params.slug);
  return successResponse(res, {
    message: 'Store fetched',
    data: { store }
  });
}

async function updateStore(req, res) {
  const store = await service.updateStore(req.params.id, req.body);
  return successResponse(res, {
    message: 'Store updated',
    data: { store }
  });
}

async function updateStoreStatus(req, res) {
  const store = await service.updateStoreStatus(req.params.id, req.body.status);
  return successResponse(res, {
    message: 'Store status updated',
    data: { store }
  });
}

async function listModules(req, res) {
  const modules = await service.listModules(req.params.id);
  return successResponse(res, {
    message: 'Store modules fetched',
    data: { modules }
  });
}

async function replaceModules(req, res) {
  const modules = await service.replaceModules(req.params.id, req.body.modules);
  return successResponse(res, {
    message: 'Store modules updated',
    data: { modules }
  });
}

async function impersonateStore(req, res) {
  const result = await service.impersonateStore(req.params.id, req.user, req.audit || {});
  return successResponse(res, {
    message: 'Store impersonation session created',
    data: result
  });
}

module.exports = {
  createStore,
  getStore,
  getStoreBySlug,
  impersonateStore,
  listModuleCatalog,
  listModules,
  listStores,
  replaceModules,
  updateStore,
  updateStoreStatus
};
