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
    auditService.auditSuccessfulMutation(req, res).catch((error) => {
      // This is intentionally visible: the mutation has already completed,
      // so swallowing an audit failure would make an operational gap invisible.
      console.error('Post-response audit write failed', {
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id || null,
        message: error.message
      });
    });
  });

  next();
}

module.exports = {
  auditContext,
  mutationAuditLogger,
  writeAuditLog
};
