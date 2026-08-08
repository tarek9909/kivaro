const service = require('./commissions.service');
const { successResponse } = require('../../utils/response');

async function listRules(req, res) {
  const result = await service.listRules(req.query, req.user);
  successResponse(res, { message: 'Commission rules fetched', data: { commission_rules: result.rows }, meta: result.meta });
}

async function createRule(req, res) {
  const commission_rule = await service.createRule(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Commission rule created', data: { commission_rule } });
}

async function updateRule(req, res) {
  const commission_rule = await service.updateRule(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Commission rule updated', data: { commission_rule } });
}

async function deleteRule(req, res) {
  await service.deleteRule(req.params.id, req.user);
  successResponse(res, { message: 'Commission rule deleted', data: {} });
}

async function listCommissions(req, res) {
  const result = await service.listCommissions(req.query, req.user);
  successResponse(res, { message: 'Commissions fetched', data: { commissions: result.rows }, meta: result.meta });
}

async function listPayroll(req, res) {
  const result = await service.listMonthlyPayroll(req.query, req.user);
  successResponse(res, {
    message: 'Monthly payroll fetched',
    data: {
      period_month: result.period_month,
      payroll: result.payroll
    }
  });
}

async function payPayroll(req, res) {
  const payroll_payment = await service.payMonthlyPayroll(req.params.salesmanId, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Monthly payroll paid', data: { payroll_payment } });
}

async function getCommission(req, res) {
  const commission = await service.getCommission(req.params.id, req.user);
  successResponse(res, { message: 'Commission fetched', data: { commission } });
}

async function approveCommission(req, res) {
  const commission = await service.approveCommission(req.params.id, req.user.id, req.user);
  successResponse(res, { message: 'Commission approved', data: { commission } });
}

async function payCommission(req, res) {
  const payment = await service.payCommission(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Commission paid', data: { payment } });
}

module.exports = {
  approveCommission,
  createRule,
  deleteRule,
  getCommission,
  listCommissions,
  listPayroll,
  listRules,
  payCommission,
  payPayroll,
  updateRule
};
