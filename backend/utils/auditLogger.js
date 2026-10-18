const AuditLog = require('../models/AuditLog');

function getRequestIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    ''
  );
}

async function createAuditLog({
  req = null,
  action,
  message = '',
  actorId = null,
  caseId = null,
  evidenceId = null,
  metadata = {},
}) {
  return AuditLog.create({
    action,
    message,
    actorId: actorId || req?.user?._id || req?.user?.id || null,
    caseId,
    evidenceId,
    metadata,
    ip: req ? getRequestIp(req) : '',
    userAgent: req ? req.get('user-agent') || '' : '',
  });
}

module.exports = {
  createAuditLog,
};