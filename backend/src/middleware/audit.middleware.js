const auditService = require('../services/audit.service');

function auditContext(req, res, next) {
  req.audit = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null
  };

  next();
}

async function writeAuditLog(connection, event) {
  await auditService.logAudit(connection, event);
}

function mutationAuditLogger(req, res, next) {
  res.on('finish', () => {
    auditService.auditSuccessfulMutation(req, res).catch(() => {});
  });

  next();
}

module.exports = {
  auditContext,
  mutationAuditLogger,
  writeAuditLog
};
