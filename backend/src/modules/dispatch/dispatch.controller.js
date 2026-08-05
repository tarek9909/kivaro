const service = require('./dispatch.service');
const settingsModel = require('../settings/settings.model');
const ApiError = require('../../utils/ApiError');
const {
  sendDispatchCustomerChecklistPdf,
  sendDispatchCustomerReceiptPdf,
  sendDispatchCustomerAcceptanceConsentPdf,
  sendDispatchCustomerDeliveryDocumentPdf,
  sendInvoicePdf,
  sendReturnCreditNotePdf
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

async function reopenCloseout(req, res) {
  const dispatch_request = await service.reopenCloseout(req.params.id, req.user);
  successResponse(res, { message: 'Draft delivery closeout reopened', data: { dispatch_request } });
}

async function recordDeliveredDocument(res, record) {
  try {
    await record();
  } catch (error) {
    // The PDF has already reached the HTTP response. Do not attempt a second
    // error response; a repeat download safely retries idempotent tracking.
    console.error('Document delivery audit recording failed:', error.message);
  }
}

async function generateCustomerChecklist(req, res) {
  const dispatch = await service.getDispatchRequest(req.params.id, req.user);
  const company = await settingsModel.getCompanyProfile(dispatch.store_id);
  await sendDispatchCustomerChecklistPdf(res, dispatch, company || {});
  await recordDeliveredDocument(res, () => service.recordDocumentGeneration(req.params.id, 'customer_table', {}, req.user.id, req.user));
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
  const company = await settingsModel.getCompanyProfile(invoice.store_id);
  await sendInvoicePdf(res, invoice, invoice.lines, company || {});
  await recordDeliveredDocument(res, () => service.recordDocumentGeneration(invoice.dispatch_request_id, 'invoice', { invoice_id: invoice.id }, req.user.id, req.user));
}

async function getReturnCreditNote(req, res) {
  const return_credit_note = await service.getReturnCreditNote(req.params.id, req.user);
  successResponse(res, { message: 'Return credit note fetched', data: { return_credit_note } });
}

async function generateReturnCreditNotePdf(req, res) {
  const creditNote = await service.getReturnCreditNote(req.params.id, req.user);
  const company = await settingsModel.getCompanyProfile(creditNote.store_id);
  await sendReturnCreditNotePdf(res, creditNote, company || {});
}

async function generateCustomerDeliveryDocumentPdf(req, res) {
  const customerId = Number(req.params.customerId);
  const dispatchId = Number(req.params.id);
  const part = req.query.part;
  const dispatch = await service.getDispatchRequest(dispatchId, req.user);
  const customer = (dispatch.customers || []).find((c) => Number(c.id) === customerId);
  if (!customer) throw ApiError.notFound('Dispatch customer not found');
  const company = await settingsModel.getCompanyProfile(dispatch.store_id);
  const lines = (dispatch.items || []).filter((item) => Number(item.dispatch_customer_id) === customerId);
  if (part === 'receipt') {
    await sendDispatchCustomerReceiptPdf(res, dispatch, customer, lines, company || {});
    await recordDeliveredDocument(res, () => service.recordDocumentGeneration(dispatchId, 'customer_receipt', { customer_id: customerId }, req.user.id, req.user));
    return;
  }
  if (part === 'consent') {
    await sendDispatchCustomerAcceptanceConsentPdf(res, dispatch, customer, company || {});
    await recordDeliveredDocument(res, () => service.recordDocumentGeneration(dispatchId, 'customer_acceptance_consent', { customer_id: customerId }, req.user.id, req.user));
    return;
  }
  await sendDispatchCustomerDeliveryDocumentPdf(res, dispatch, customer, lines, company || {});
  await recordDeliveredDocument(res, () => service.recordDeliveryDocumentGeneration(dispatchId, customerId, req.user.id, req.user));
}

module.exports = {
  addCustomer,
  addItem,
  approveDispatch,
  cancelDispatch,
  createCloseout,
  createDispatch,
  createReturn,
  deleteItem,
  dispatchStock,
  generateCustomerChecklist,
  generateCustomerDeliveryDocumentPdf,
  generateInvoicePdf,
  generateReturnCreditNotePdf,
  getDispatch,
  getInvoice,
  getReturnCreditNote,
  getSettlement,
  listDispatches,
  listInvoices,
  listSettlements,
  postSettlement,
  reworkDispatch,
  reopenCloseout,
  submitDispatch,
  updateItem,
  updateDispatch
};
