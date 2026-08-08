const service = require('./pos.service');
const { successResponse } = require('../../utils/response');

async function listCatalog(req, res) {
  const result = await service.listCatalog(req.query, req.user);
  successResponse(res, {
    message: 'Mini POS catalogue fetched',
    data: { sale_catalog_entries: result.rows },
    meta: result.meta
  });
}

async function listWarehouses(req, res) {
  const warehouses = await service.listOwnWarehouses(req.query, req.user);
  successResponse(res, {
    message: 'Mini POS warehouses fetched',
    data: { warehouses }
  });
}

async function listTerritories(req, res) {
  const territories = await service.listOwnTerritories(req.query, req.user);
  successResponse(res, {
    message: 'Mini POS territories fetched',
    data: { territories }
  });
}

async function listCustomers(req, res) {
  const result = await service.listOwnCustomers(req.query, req.user);
  successResponse(res, {
    message: 'Mini POS customers fetched',
    data: { customers: result.rows },
    meta: result.meta
  });
}

async function createCustomer(req, res) {
  const customer = await service.createOwnCustomer(req.body, req.user.id, req.user);
  successResponse(res, {
    statusCode: 201,
    message: 'Mini POS customer created',
    data: { customer }
  });
}

async function getWorkspace(req, res) {
  const workspace = await service.getOwnWorkspace(req.query, req.user);
  successResponse(res, {
    message: 'Salesman workspace fetched',
    data: { workspace }
  });
}

module.exports = {
  createCustomer,
  getWorkspace,
  listCatalog,
  listWarehouses,
  listCustomers,
  listTerritories
};
