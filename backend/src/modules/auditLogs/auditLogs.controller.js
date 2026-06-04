const service = require('./auditLogs.service');
const { successResponse } = require('../../utils/response');

async function listAuditLogs(req, res) {
  const result = await service.listAuditLogs(req.query, req.user);
  successResponse(res, { message: 'Audit logs fetched', data: { audit_logs: result.rows }, meta: result.meta });
}

async function getAuditLog(req, res) {
  const audit_log = await service.getAuditLog(req.params.id, req.user);
  successResponse(res, { message: 'Audit log fetched', data: { audit_log } });
}

module.exports = {
  getAuditLog,
  listAuditLogs
};
