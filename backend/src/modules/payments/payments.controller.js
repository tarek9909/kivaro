const service = require('./payments.service');
const { sendCustomerReceiptPdf } = require('../../utils/pdf');
const { successResponse } = require('../../utils/response');

function list(method, key, message) {
  return async (req, res) => {
    const result = await method(req.query, req.user);
    successResponse(res, { message, data: { [key]: result.rows }, meta: result.meta });
  };
}

async function getDebt(req, res) {
  const customer_debt = await service.getDebt(req.params.id, req.user);
  successResponse(res, { message: 'Customer debt fetched', data: { customer_debt } });
}

async function payDebt(req, res) {
  const payment = await service.payDebt(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Customer debt payment created', data: { payment } });
}

async function applyCreditToDebt(req, res) {
  const credit_application = await service.applyCreditToDebt(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Customer credit applied', data: { credit_application } });
}

async function updateDebtStatus(req, res) {
  const customer_debt = await service.updateDebtStatus(req.params.id, req.body.status, req.user);
  successResponse(res, { message: 'Customer debt status updated', data: { customer_debt } });
}

async function createPayment(req, res) {
  const payment = await service.createCustomerPayment(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Customer payment created', data: { payment } });
}

async function getReceipt(req, res) {
  const customer_receipt = await service.getReceipt(req.params.id, req.user);
  successResponse(res, { message: 'Customer receipt fetched', data: { customer_receipt } });
}

async function printReceipt(req, res) {
  const customer_receipt = await service.markReceiptPrinted(req.params.id, req.user);

  if (req.query.format === 'pdf') {
    return sendCustomerReceiptPdf(res, customer_receipt);
  }

  successResponse(res, { message: 'Customer receipt marked printed', data: { customer_receipt } });
}

module.exports = {
  applyCreditToDebt,
  createPayment,
  getDebt,
  getReceipt,
  listCredits: list(service.listCredits, 'customer_credits', 'Customer credits fetched'),
  listDebts: list(service.listDebts, 'customer_debts', 'Customer debts fetched'),
  listPayments: list(service.listPayments, 'customer_payments', 'Customer payments fetched'),
  listReceipts: list(service.listReceipts, 'customer_receipts', 'Customer receipts fetched'),
  payDebt,
  printReceipt,
  updateDebtStatus
};
