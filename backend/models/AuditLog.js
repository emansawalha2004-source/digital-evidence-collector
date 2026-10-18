const mongoose = require('mongoose');

const AUDIT_ACTIONS = [
  'register',
  'login',
  'password_changed',
  'mfa_backup_codes_regenerated',
  'mfa_disabled',
  'mfa_enabled',
  'mfa_setup_started',
  'login_failed',
  'otp_challenge_created',
  'otp_verified',
  'otp_failed',
  'otp_rate_limited',
  'create_case',
  'update_case',
  'upload_evidence',
  'update_evidence',
  'archive_evidence',
  'restore_evidence',
  'download_evidence',
  'preview_evidence',
  'verify_integrity',
  'add_note',
  'generate_report',
  'analyze_text',
  'analyze_link',
  'analyze_evidence',
];

const auditLogSchema = new mongoose.Schema(
  {
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', default: null, index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true, enum: AUDIT_ACTIONS, index: true },
    message: { type: String, trim: true, maxlength: 1000, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, trim: true, default: '' },
    userAgent: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now, immutable: true, index: true },
  },
  { versionKey: false }
);

auditLogSchema.index({ caseId: 1, createdAt: -1 });
auditLogSchema.index({ evidenceId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
