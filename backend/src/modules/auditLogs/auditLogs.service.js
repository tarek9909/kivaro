const ApiError = require('../../utils/ApiError');
const { assertRowInScope, scopedQuery } = require('../../utils/storeScope');
const model = require('./auditLogs.model');

async function getAuditLog(id, actor = {}) {
  const auditLog = await model.findAuditLogById(id);

  return assertRowInScope(auditLog, actor, 'Audit log not found');
}

module.exports = {
  getAuditLog,
  listAuditLogs: (query, actor = {}) => model.listAuditLogs(scopedQuery(query, actor))
};
