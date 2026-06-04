const service = require('./production.service');
const { successResponse } = require('../../utils/response');

function list(method, key, message) {
  return async (req, res) => {
    const result = await method(req.query, req.user);
    successResponse(res, { message, data: { [key]: result.rows }, meta: result.meta });
  };
}

async function createConfig(req, res) {
  const packaging_configuration = await service.createPackagingConfiguration(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Packaging configuration created', data: { packaging_configuration } });
}

async function getConfig(req, res) {
  const packaging_configuration = await service.getPackagingConfiguration(req.params.id, req.user);
  successResponse(res, { message: 'Packaging configuration fetched', data: { packaging_configuration } });
}

async function updateConfig(req, res) {
  const packaging_configuration = await service.updatePackagingConfiguration(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Packaging configuration updated', data: { packaging_configuration } });
}

async function deleteConfig(req, res) {
  await service.deletePackagingConfiguration(req.params.id, req.user);
  successResponse(res, { message: 'Packaging configuration deleted', data: {} });
}

async function addComponent(req, res) {
  const component = await service.addPackagingComponent(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Packaging component added', data: { component } });
}

async function updateComponent(req, res) {
  const component = await service.updatePackagingComponent(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Packaging component updated', data: { component } });
}

async function deleteComponent(req, res) {
  await service.deletePackagingComponent(req.params.id, req.user);
  successResponse(res, { message: 'Packaging component deleted', data: {} });
}

async function calculateCost(req, res) {
  const cost = await service.calculateConfigCost(req.params.id, req.body.warehouse_id, req.user);
  successResponse(res, { message: 'Packaging cost calculated', data: { cost } });
}

async function createBatch(req, res) {
  const production_batch = await service.createProductionBatch(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Production batch created', data: { production_batch } });
}

async function getBatch(req, res) {
  const production_batch = await service.getProductionBatch(req.params.id, req.user);
  successResponse(res, { message: 'Production batch fetched', data: { production_batch } });
}

async function startBatch(req, res) {
  const production_batch = await service.startProductionBatch(req.params.id, req.user);
  successResponse(res, { message: 'Production batch started', data: { production_batch } });
}

async function completeBatch(req, res) {
  const production_batch = await service.completeProductionBatch(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { message: 'Production batch completed', data: { production_batch } });
}

async function cancelBatch(req, res) {
  const production_batch = await service.cancelProductionBatch(req.params.id, req.user);
  successResponse(res, { message: 'Production batch cancelled', data: { production_batch } });
}

module.exports = {
  addComponent,
  calculateCost,
  cancelBatch,
  completeBatch,
  createBatch,
  createConfig,
  deleteComponent,
  deleteConfig,
  getBatch,
  getConfig,
  listBatches: list(service.listProductionBatches, 'production_batches', 'Production batches fetched'),
  listConfigs: list(service.listPackagingConfigurations, 'packaging_configurations', 'Packaging configurations fetched'),
  listCostHistory: list(service.listProductCostHistory, 'product_cost_history', 'Product cost history fetched'),
  startBatch,
  updateComponent,
  updateConfig
};
