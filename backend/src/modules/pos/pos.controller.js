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

async function listOrders(req, res) {
  const result = await service.listOwnOrders(req.query, req.user);
  successResponse(res, {
    message: 'Mini POS orders fetched',
    data: { pos_orders: result.rows },
    meta: result.meta
  });
}

async function getWorkspace(req, res) {
  const workspace = await service.getOwnWorkspace(req.query, req.user);
  successResponse(res, {
    message: 'Salesman workspace fetched',
    data: { workspace }
  });
}

async function createOrder(req, res) {
  const pos_order = await service.createOwnOrder(req.body, req.user.id, req.user);
  successResponse(res, {
    statusCode: 201,
    message: 'Mini POS order created',
    data: { pos_order }
  });
}

async function getOrder(req, res) {
  const pos_order = await service.getOwnOrder(req.params.id, req.user, req.query);
  successResponse(res, {
    message: 'Mini POS order fetched',
    data: { pos_order }
  });
}

async function updateOrder(req, res) {
  const pos_order = await service.updateOwnOrder(req.params.id, req.body, req.user);
  successResponse(res, {
    message: 'Mini POS order updated',
    data: { pos_order }
  });
}

async function cancelOrder(req, res) {
  const pos_order = await service.cancelOwnOrder(req.params.id, req.body, req.user);
  successResponse(res, {
    message: 'Mini POS order cancelled',
    data: { pos_order }
  });
}

async function listReview(req, res) {
  const result = await service.listManagerReview(req.query, req.user);
  successResponse(res, {
    message: 'Grouped Mini POS review fetched',
    data: { salesmen: result.rows },
    meta: result.meta
  });
}

async function prepareDispatch(req, res) {
  const dispatch_preparation = await service.prepareSelectedOrders(req.body, req.user);
  successResponse(res, {
    message: 'Mini POS dispatch preparation generated',
    data: { dispatch_preparation }
  });
}

module.exports = {
  cancelOrder,
  createCustomer,
  createOrder,
  getOrder,
  getWorkspace,
  listCatalog,
  listCustomers,
  listOrders,
  listReview,
  listTerritories,
  prepareDispatch,
  updateOrder
};
