const AuditLog = require('../models/AuditLog');

function getRequestIp(req) {
  if (!req) return '';
  // الاعتماد على req.ip الذي يحترم إعدادات express 'trust proxy' بشكل آمن ومحمي من التلاعب
  return req.ip || req.socket?.remoteAddress || '';
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
    ip: getRequestIp(req),
    userAgent: req ? req.get('user-agent') || '' : '',
  });
}

module.exports = {
  createAuditLog,
};
