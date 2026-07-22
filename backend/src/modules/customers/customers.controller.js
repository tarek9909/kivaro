const service = require('./customers.service');
const paymentService = require('../payments/payments.service');
const { successResponse } = require('../../utils/response');
const { sendCsv } = require('../../utils/csv');

async function listCustomers(req, res) {
  const result = await service.listCustomers(req.query, req.user);
  successResponse(res, { message: 'Customers fetched', data: { customers: result.rows }, meta: result.meta });
}

async function exportCustomers(req, res) {
  const rows = await service.exportCustomers(req.query, req.user);
  const dataset = req.query.dataset || 'directory';
  return sendCsv(res, `customers-${dataset}.csv`, rows);
}

async function createCustomer(req, res) {
  const customer = await service.createCustomer(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Customer created', data: { customer } });
}

async function getCustomer(req, res) {
  const customer = await service.getCustomer(req.params.id, req.user);
  successResponse(res, { message: 'Customer fetched', data: { customer } });
}

async function updateCustomer(req, res) {
  const customer = await service.updateCustomer(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Customer updated', data: { customer } });
}

async function deleteCustomer(req, res) {
  await service.deleteCustomer(req.params.id, req.user);
  successResponse(res, { message: 'Customer deleted', data: {} });
}

async function listCustomerReceipts(req, res) {
  await service.getCustomer(req.params.id, req.user);
  const result = await paymentService.listReceipts({
    ...req.query,
    customer_id: req.params.id
  }, req.user);
  successResponse(res, {
    message: 'Customer receipts fetched',
    data: { customer_receipts: result.rows },
    meta: result.meta
  });
}

async function listCustomerDebts(req, res) {
  await service.getCustomer(req.params.id, req.user);
  const result = await paymentService.listDebts({
    ...req.query,
    customer_id: req.params.id
  }, req.user);
  successResponse(res, {
    message: 'Customer debts fetched',
    data: { customer_debts: result.rows },
    meta: result.meta
  });
}

async function listCustomerPayments(req, res) {
  await service.getCustomer(req.params.id, req.user);
  const result = await paymentService.listPayments({
    ...req.query,
    customer_id: req.params.id
  }, req.user);
  successResponse(res, {
    message: 'Customer payments fetched',
    data: { customer_payments: result.rows },
    meta: result.meta
  });
}

module.exports = {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomerDebts,
  listCustomerPayments,
  listCustomerReceipts,
  listCustomers,
  exportCustomers,
  updateCustomer
};
