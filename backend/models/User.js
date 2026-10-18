const mongoose = require('mongoose');

const USER_ROLES = ['admin', 'investigator', 'viewer', 'auditor'];

const backupCodeSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true, select: false },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, minlength: [2, 'Full name must be at least 2 characters'], maxlength: [120, 'Full name cannot exceed 120 characters'] },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, index: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email format'], maxlength: [160, 'Email cannot exceed 160 characters'] },
    passwordHash: { type: String, required: [true, 'Password hash is required'], select: false },
    role: { type: String, enum: { values: USER_ROLES, message: 'Invalid user role' }, default: 'investigator', index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false, default: null },
    mfaTempSecret: { type: String, select: false, default: null },
    mfaBackupCodes: { type: [backupCodeSchema], default: [], select: false },
    mfaEnabledAt: { type: Date, default: null },
    loginOtpHash: { type: String, select: false, default: null },
    loginOtpExpiresAt: { type: Date, select: false, default: null },
    loginOtpAttempts: { type: Number, default: 0 },
    loginOtpLastSentAt: { type: Date, default: null },
    loginOtpSendWindowStartedAt: { type: Date, default: null },
    loginOtpSendCount: { type: Number, default: 0 },
    loginOtpBlockedUntil: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ role: 1, isActive: 1 });

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.mfaSecret;
  delete user.mfaTempSecret;
  delete user.mfaBackupCodes;
  delete user.loginOtpHash;
  delete user.loginOtpExpiresAt;
  delete user.loginOtpLastSentAt;
  delete user.loginOtpSendWindowStartedAt;
  delete user.loginOtpSendCount;
  delete user.loginOtpBlockedUntil;
  return user;
};

module.exports = mongoose.model('User', userSchema);
module.exports.USER_ROLES = USER_ROLES;
