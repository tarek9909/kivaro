const service = require('./packaging.service');
const { successResponse } = require('../../utils/response');

function list(serviceMethod, key, message) {
  return async (req, res) => {
    const result = await serviceMethod(req.query, req.user);
    successResponse(res, { message, data: { [key]: result.rows }, meta: result.meta });
  };
}

async function createGroup(req, res) {
  const packaging_group = await service.createGroup(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Packaging group created', data: { packaging_group } });
}

async function getGroup(req, res) {
  const packaging_group = await service.getGroup(req.params.id, req.user);
  successResponse(res, { message: 'Packaging group fetched', data: { packaging_group } });
}

async function updateGroup(req, res) {
  const packaging_group = await service.updateGroup(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Packaging group updated', data: { packaging_group } });
}

async function deleteGroup(req, res) {
  await service.deleteGroup(req.params.id, req.user);
  successResponse(res, { message: 'Packaging group deactivated', data: {} });
}

async function replaceComponents(req, res) {
  const packaging_group = await service.replaceComponents(req.params.id, req.body.components, req.user);
  successResponse(res, { message: 'Packaging group components replaced', data: { packaging_group } });
}

async function preview(req, res) {
  const preview = await service.previewGroup(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Packaging preview generated', data: { preview } });
}

async function complete(req, res) {
  const result = await service.completePackaging(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Packaging completed', data: result });
}

async function getOperation(req, res) {
  const packaging_operation = await service.getOperation(req.params.id, req.user);
  successResponse(res, { message: 'Packaging operation fetched', data: { packaging_operation } });
}

async function createCatalogEntry(req, res) {
  const sale_catalog_entry = await service.createSaleCatalogEntry(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Sale catalog entry created', data: { sale_catalog_entry } });
}

async function getCatalogEntry(req, res) {
  const sale_catalog_entry = await service.getSaleCatalogEntry(req.params.id, req.user);
  successResponse(res, { message: 'Sale catalog entry fetched', data: { sale_catalog_entry } });
}

async function updateCatalogEntry(req, res) {
  const sale_catalog_entry = await service.updateSaleCatalogEntry(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Sale catalog entry updated', data: { sale_catalog_entry } });
}

module.exports = {
  complete,
  createCatalogEntry,
  createGroup,
  deleteGroup,
  getCatalogEntry,
  getGroup,
  getOperation,
  listCatalogEntries: list(service.listSaleCatalogEntries, 'sale_catalog_entries', 'Sale catalog entries fetched'),
  listGroups: list(service.listGroups, 'packaging_groups', 'Packaging groups fetched'),
  listOperations: list(service.listOperations, 'packaging_operations', 'Packaging operations fetched'),
  listPosCatalog: list(service.listPosCatalog, 'sale_catalog_entries', 'POS catalog fetched'),
  listReadyStock: list(service.listReadyStock, 'ready_stock_containers', 'Ready stock fetched'),
  preview,
  replaceComponents,
  updateCatalogEntry,
  updateGroup
};
