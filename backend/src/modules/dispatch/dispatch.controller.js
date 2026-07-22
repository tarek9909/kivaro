const service = require('./dispatch.service');
const settingsModel = require('../settings/settings.model');
const {
  sendDispatchCustomerChecklistPdf,
  sendDispatchQuantityPdf,
  sendInvoicePdf
} = require('../../utils/pdf');
const { successResponse } = require('../../utils/response');

async function listDispatches(req, res) {
  const result = await service.listDispatchRequests(req.query, req.user);
  successResponse(res, { message: 'Dispatches fetched', data: { dispatch_requests: result.rows }, meta: result.meta });
}

async function createDispatch(req, res) {
  const dispatch_request = await service.createDispatchRequest(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch draft created', data: { dispatch_request } });
}

async function createDispatchFromPos(req, res) {
  const dispatch_request = await service.createDispatchFromPos(req.body, req.user.id, req.user);
  successResponse(res, {
    statusCode: 201,
    message: 'Selected POS orders converted into a combined dispatch draft',
    data: { dispatch_request }
  });
}

async function getDispatch(req, res) {
  const dispatch_request = await service.getDispatchRequest(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch fetched', data: { dispatch_request } });
}

async function updateDispatch(req, res) {
  const dispatch_request = await service.updateDispatchRequest(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Dispatch updated', data: { dispatch_request } });
}

async function addCustomer(req, res) {
  const dispatch_customer = await service.addCustomer(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch customer added', data: { dispatch_customer } });
}

async function addItem(req, res) {
  const dispatch_item = await service.addItem(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch line added', data: { dispatch_item } });
}

async function updateItem(req, res) {
  const dispatch_item = await service.updateItem(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Dispatch line updated', data: { dispatch_item } });
}

async function deleteItem(req, res) {
  const dispatch_request = await service.deleteItem(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch line removed', data: { dispatch_request } });
}

async function submitDispatch(req, res) {
  const dispatch_request = await service.submitDispatch(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch submitted and invoices issued', data: { dispatch_request } });
}

async function reworkDispatch(req, res) {
  const dispatch_request = await service.reworkDispatch(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Dispatch returned to draft and current invoices voided', data: { dispatch_request } });
}

async function approveDispatch(req, res) {
  const dispatch_request = await service.approveDispatch(req.params.id, req.user.id, req.user);
  successResponse(res, { message: 'Dispatch approved with source reservations', data: { dispatch_request } });
}

async function dispatchStock(req, res) {
  const dispatch_request = await service.dispatchStock(req.params.id, req.user.id, req.user);
  successResponse(res, { message: 'Dispatch physically issued from inventory', data: { dispatch_request } });
}

async function cancelDispatch(req, res) {
  const dispatch_request = await service.cancelDispatch(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch cancelled', data: { dispatch_request } });
}

async function createReturn(req, res) {
  const dispatch_request = await service.createReturn(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Dispatch return recorded', data: { dispatch_request } });
}

async function createCloseout(req, res) {
  const dispatch_settlement = await service.createCloseout(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Delivery closeout submitted', data: { dispatch_settlement } });
}

async function postSettlement(req, res) {
  const dispatch_settlement = await service.postSettlement(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { message: 'Settlement posted', data: { dispatch_settlement } });
}

async function listSettlements(req, res) {
  const dispatch_settlements = await service.listSettlements(req.params.id, req.user);
  successResponse(res, { message: 'Dispatch settlements fetched', data: { dispatch_settlements } });
}

async function getSettlement(req, res) {
  const dispatch_settlement = await service.getSettlement(req.params.id, req.user);
  successResponse(res, { message: 'Settlement fetched', data: { dispatch_settlement } });
}

async function generateCustomerChecklist(req, res) {
  const generated = await service.recordDocumentGeneration(req.params.id, 'customer_table', {}, req.user.id, req.user);
  const dispatch = await service.getDispatchRequest(req.params.id, req.user);
  const company = await settingsModel.getCompanyProfile(dispatch.store_id);
  return sendDispatchCustomerChecklistPdf(res, dispatch, company || {});
}

async function generateQuantityTable(req, res) {
  await service.recordDocumentGeneration(req.params.id, 'quantity_table', {}, req.user.id, req.user);
  const dispatch = await service.getDispatchRequest(req.params.id, req.user);
  const company = await settingsModel.getCompanyProfile(dispatch.store_id);
  return sendDispatchQuantityPdf(res, dispatch, company || {});
}

async function listInvoices(req, res) {
  const result = await service.listInvoices(req.query, req.user);
  successResponse(res, { message: 'Invoices fetched', data: { invoices: result.rows }, meta: result.meta });
}

async function getInvoice(req, res) {
  const invoice = await service.getInvoice(req.params.id, req.user);
  successResponse(res, { message: 'Invoice fetched', data: { invoice } });
}

async function generateInvoicePdf(req, res) {
  const invoice = await service.getInvoice(req.params.id, req.user);
  await service.recordDocumentGeneration(invoice.dispatch_request_id, 'invoice', { invoice_id: invoice.id }, req.user.id, req.user);
  const company = await settingsModel.getCompanyProfile(invoice.store_id);
  return sendInvoicePdf(res, invoice, invoice.lines, company || {});
}

module.exports = {
  addCustomer,
  addItem,
  approveDispatch,
  cancelDispatch,
  createCloseout,
  createDispatch,
  createDispatchFromPos,
  createReturn,
  deleteItem,
  dispatchStock,
  generateCustomerChecklist,
  generateInvoicePdf,
  generateQuantityTable,
  getDispatch,
  getInvoice,
  getSettlement,
  listDispatches,
  listInvoices,
  listSettlements,
  postSettlement,
  reworkDispatch,
  submitDispatch,
  updateItem,
  updateDispatch
};
