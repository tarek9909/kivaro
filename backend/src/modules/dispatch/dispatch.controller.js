const service = require('./dispatch.service');
const {
  sendDispatchCustomerReceiptsPdf,
  sendDispatchSummaryPdf
} = require('../../utils/pdf');
const { successResponse } = require('../../utils/response');

async function listDispatches(req, res) {
  const result = await service.listDispatchRequests(req.query, req.user);
  successResponse(res, { message: 'Dispatch requests fetched', data: { dispatch_requests: result.rows }, meta: result.meta });
}

async function createDispatch(req, res) {
  const dispatch_request = await service.createDispatchRequest(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch request created', data: { dispatch_request } });
}

async function getDispatch(req, res) {
  const dispatch_request = await service.getDispatchRequest(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch request fetched', data: { dispatch_request } });
}

async function printDispatchSummary(req, res) {
  const dispatch_request = await service.getDispatchRequest(req.params.id, req.user);

  if (req.query.format === 'pdf') {
    return sendDispatchSummaryPdf(res, dispatch_request);
  }

  return successResponse(res, {
    message: 'Dispatch summary fetched',
    data: { dispatch_request }
  });
}

async function printCustomerReceipts(req, res) {
  const dispatch_request = await service.getDispatchRequest(req.params.id, req.user);

  if (req.query.format === 'pdf') {
    return sendDispatchCustomerReceiptsPdf(res, dispatch_request, { noPrice: req.query.no_price });
  }

  return successResponse(res, {
    message: 'Dispatch customer receipts fetched',
    data: {
      dispatch_request,
      customer_receipts: dispatch_request.customers
    }
  });
}

async function updateDispatch(req, res) {
  const dispatch_request = await service.updateDispatchRequest(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Dispatch request updated', data: { dispatch_request } });
}

async function addCustomer(req, res) {
  const dispatch_customer = await service.addCustomer(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch customer added', data: { dispatch_customer } });
}

async function addItem(req, res) {
  const dispatch_item = await service.addItem(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch item added', data: { dispatch_item } });
}

async function submitDispatch(req, res) {
  const dispatch_request = await service.submitDispatch(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch request submitted', data: { dispatch_request } });
}

async function approveDispatch(req, res) {
  const dispatch_request = await service.approveDispatch(req.params.id, req.user.id, req.user);
  successResponse(res, { message: 'Dispatch request approved', data: { dispatch_request } });
}

async function dispatchStock(req, res) {
  const dispatch_request = await service.dispatchStock(req.params.id, req.user.id, req.user);
  successResponse(res, { message: 'Dispatch stock moved out', data: { dispatch_request } });
}

async function cancelDispatch(req, res) {
  const dispatch_request = await service.cancelDispatch(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch request cancelled', data: { dispatch_request } });
}

async function createReturn(req, res) {
  const dispatch_return = await service.createReturn(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch return created', data: { dispatch_return } });
}

async function createSettlement(req, res) {
  const dispatch_settlement = await service.createSettlement(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch settlement created', data: { dispatch_settlement } });
}

async function listSettlements(req, res) {
  const dispatch_settlements = await service.listSettlements(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch settlements fetched', data: { dispatch_settlements } });
}

async function getSettlement(req, res) {
  const dispatch_settlement = await service.getSettlement(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch settlement fetched', data: { dispatch_settlement } });
}

async function addSettlementCustomer(req, res) {
  const dispatch_settlement_customer = await service.addSettlementCustomer(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Settlement customer added', data: { dispatch_settlement_customer } });
}

async function completeSettlement(req, res) {
  const dispatch_request = await service.completeSettlement(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { message: 'Dispatch settlement completed', data: { dispatch_request } });
}

async function cancelSettlement(req, res) {
  const dispatch_request = await service.cancelSettlement(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch settlement cancelled', data: { dispatch_request } });
}

module.exports = {
  addCustomer,
  addItem,
  addSettlementCustomer,
  approveDispatch,
  cancelDispatch,
  cancelSettlement,
  completeSettlement,
  createDispatch,
  createReturn,
  createSettlement,
  dispatchStock,
  getDispatch,
  getSettlement,
  listSettlements,
  listDispatches,
  printCustomerReceipts,
  printDispatchSummary,
  submitDispatch,
  updateDispatch
};
