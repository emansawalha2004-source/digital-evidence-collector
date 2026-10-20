const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { signToken, signMfaToken, verifyMfaToken } = require('../utils/jwt');
const { createAuditLog } = require('../utils/auditLogger');
const { generateSecret, verifyTotp, buildOtpAuthUrl, buildQrCodeDataUrl, generateBackupCodes, hashBackupCodes, verifyBackupCode } = require('../utils/mfa');
const { isEmailOtpEnabled, shouldExposeDevOtp, sendOtpEmail } = require('../utils/emailService');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60);
const OTP_RECIPIENT_WINDOW_HOURS = Number(process.env.OTP_RECIPIENT_WINDOW_HOURS || 24);
const OTP_RECIPIENT_MAX_PER_WINDOW = Number(process.env.OTP_RECIPIENT_MAX_PER_WINDOW || 8);
const OTP_RECIPIENT_BLOCK_MINUTES = Number(process.env.OTP_RECIPIENT_BLOCK_MINUTES || 60);

async function enforceOtpRecipientLimit(user, req, purpose) {
  const now = Date.now();
  const cooldownMs = Math.max(0, OTP_RESEND_COOLDOWN_SECONDS) * 1000;
  const windowMs = Math.max(1, OTP_RECIPIENT_WINDOW_HOURS) * 60 * 60 * 1000;
  const blockMs = Math.max(1, OTP_RECIPIENT_BLOCK_MINUTES) * 60 * 1000;
  const maxPerWindow = Math.max(1, OTP_RECIPIENT_MAX_PER_WINDOW);

  if (user.loginOtpBlockedUntil && user.loginOtpBlockedUntil.getTime() > now) {
    throw AppError.tooManyRequests('OTP sending is temporarily blocked for this email. Try again later.');
  }

  if (user.loginOtpLastSentAt && now - user.loginOtpLastSentAt.getTime() < cooldownMs) {
    const waitSeconds = Math.ceil((cooldownMs - (now - user.loginOtpLastSentAt.getTime())) / 1000);
    throw AppError.tooManyRequests(`Please wait ${waitSeconds} seconds before requesting another OTP.`);
  }

  let windowStart = user.loginOtpSendWindowStartedAt;
  let count = Number(user.loginOtpSendCount || 0);
  if (!windowStart || now - windowStart.getTime() > windowMs) {
    windowStart = new Date(now);
    count = 0;
  }

  if (count >= maxPerWindow) {
    user.loginOtpBlockedUntil = new Date(now + blockMs);
    user.loginOtpSendWindowStartedAt = windowStart;
    user.loginOtpSendCount = count;
    await user.save();
    await audit(req, 'otp_rate_limited', user, `OTP rate limit reached for: ${user.email}`, { purpose, maxPerWindow, windowHours: OTP_RECIPIENT_WINDOW_HOURS });
    throw AppError.tooManyRequests('OTP limit reached for this email. Try again later.');
  }

  user.loginOtpLastSentAt = new Date(now);
  user.loginOtpSendWindowStartedAt = windowStart;
  user.loginOtpSendCount = count + 1;
}

function generateLoginOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function createLoginOtpChallenge(user, req, challengeType, purpose = 'login') {
  await enforceOtpRecipientLimit(user, req, purpose);
  const code = generateLoginOtp();
  const expiresMinutes = Number(process.env.LOGIN_OTP_EXPIRES_MINUTES || 5);
  user.loginOtpHash = await bcrypt.hash(code, 12);
  user.loginOtpExpiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  user.loginOtpAttempts = 0;
  await user.save();

  if (isEmailOtpEnabled()) {
    await sendOtpEmail({
      to: user.email,
      fullName: user.fullName,
      otp: code,
      purpose,
    });
  } else if (process.env.NODE_ENV !== 'production') {
    console.log(`[EvidenceSystem DEV OTP] ${user.email}: ${code}`);
  }

  await audit(req, 'otp_challenge_created', user, `OTP challenge created for: ${user.email}`, {
    challengeType,
    delivery: isEmailOtpEnabled() ? 'email' : 'development',
    purpose,
  });

  return shouldExposeDevOtp() ? code : null;
}

async function verifyLoginOtp(user, code) {
  const normalized = String(code || '').trim();
  if (!user.loginOtpHash || !user.loginOtpExpiresAt || user.loginOtpExpiresAt < new Date()) return false;
  if ((user.loginOtpAttempts || 0) >= 5) return false;
  const ok = await bcrypt.compare(normalized, user.loginOtpHash);
  if (!ok) {
    user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
    await user.save();
    return false;
  }
  user.loginOtpHash = null;
  user.loginOtpExpiresAt = null;
  user.loginOtpAttempts = 0;
  await user.save();
  return true;
}

function sanitizeUser(user) {
  const value = user.toObject ? user.toObject() : { ...user };
  delete value.passwordHash;
  delete value.mfaSecret;
  delete value.mfaTempSecret;
  delete value.mfaBackupCodes;
  delete value.loginOtpHash;
  delete value.loginOtpExpiresAt;
  delete value.loginOtpLastSentAt;
  delete value.loginOtpSendWindowStartedAt;
  delete value.loginOtpSendCount;
  delete value.loginOtpBlockedUntil;
  return value;
}

function validatePassword(password) {
  return typeof password === 'string'
    && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

async function audit(req, action, user, message, metadata = {}) {
  try { await createAuditLog({ req, action, actorId: user?._id || null, message, metadata }); } catch { /* audit must not break auth */ }
}

function invalidLoginError() { return AppError.unauthorized('Invalid email or password'); }

async function registerFailure(user, req) {
  if (!user) return;
  user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
  await user.save();
  await audit(req, 'login_failed', user, `Failed login for: ${user.email}`, { failedLoginAttempts: user.failedLoginAttempts });
}

async function resetLoginFailures(user) {
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();
}

async function validateMfaCode(user, code) {
  if (!user.mfaEnabled || !user.mfaSecret) return false;
  if (verifyTotp(user.mfaSecret, code)) return true;
  return verifyBackupCode(user, code);
}

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;
  if (!fullName || !email || !password || !confirmPassword) throw AppError.badRequest('fullName, email, password and confirmPassword are required');
  if (password !== confirmPassword) throw AppError.badRequest('Password confirmation does not match');
  if (!validatePassword(password)) throw AppError.badRequest('Password must be at least 8 characters and include uppercase, lowercase, number, and special character');

  const normalizedEmail = String(email).trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) throw AppError.conflict('Email is already registered');

  // تم التعديل: تعيين الحساب كغير مفعل (isActive: false) حتى يوافق عليه المشرف
  const user = await User.create({ 
    fullName, 
    email: normalizedEmail, 
    passwordHash: await bcrypt.hash(password, 12), 
    role: 'investigator', 
    isActive: false 
  });
  
  await audit(req, 'register', user, `User registered pending approval: ${user.email}`);
  
  return sendResponse(res, 201, {
    message: 'Registration successful. Your account is pending administrator approval.',
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw AppError.badRequest('Email and password are required');

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash +mfaSecret +mfaBackupCodes +loginOtpHash +loginOtpExpiresAt');
  if (!user) throw invalidLoginError();
  if (user.lockedUntil && user.lockedUntil > new Date()) throw AppError.tooManyRequests ? AppError.tooManyRequests('Account is temporarily locked. Try again later.') : AppError.forbidden('Account is temporarily locked. Try again later.');
  if (!user.isActive) throw AppError.unauthorized('This account is inactive or pending approval');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) { await registerFailure(user, req); throw invalidLoginError(); }

  await resetLoginFailures(user);

  // تم إزالة شرط تجاوز الـ Admin لضمان إلزام المسؤولين بالتحقق الثنائي (MFA / OTP)
  const challengeType = user.mfaEnabled ? 'totp' : 'otp';
  const devOtp = user.mfaEnabled ? null : await createLoginOtpChallenge(user, req, challengeType, 'login');
  
  return sendResponse(res, 200, {
    mfaRequired: true,
    mfaToken: signMfaToken(user),
    challengeType,
    ...(devOtp ? { devOtp } : {}),
  });
});

const verifyLoginMfa = asyncHandler(async (req, res) => {
  const { mfaToken, code } = req.body;
  if (!mfaToken || !code) throw AppError.badRequest('mfaToken and code are required');
  let payload;
  try { payload = verifyMfaToken(mfaToken); } catch { throw AppError.unauthorized('Invalid or expired MFA token'); }
  const user = await User.findById(payload.userId).select('+mfaSecret +mfaBackupCodes +loginOtpHash +loginOtpExpiresAt');
  if (!user || !user.isActive) throw AppError.unauthorized('User is not active or does not exist');
  if (user.lockedUntil && user.lockedUntil > new Date()) throw AppError.forbidden('Account is temporarily locked. Try again later.');
  const ok = user.mfaEnabled ? await validateMfaCode(user, code) : await verifyLoginOtp(user, code);
  if (!ok) {
    await audit(req, user.mfaEnabled ? 'login_failed' : 'otp_failed', user, `Invalid OTP/MFA code for: ${user.email}`);
    await registerFailure(user, req);
    throw AppError.unauthorized('Invalid verification code');
  }
  user.lastLoginAt = new Date();
  await resetLoginFailures(user);
  await audit(req, user.mfaEnabled ? 'login' : 'otp_verified', user, `User verified OTP: ${user.email}`);
  return sendResponse(res, 200, { user: sanitizeUser(user), token: signToken(user) });
});

const me = asyncHandler(async (req, res) => sendResponse(res, 200, sanitizeUser(req.user)));
const logout = asyncHandler(async (req, res) => sendResponse(res, 200, { message: 'Logged out locally. Remove the token on the client.' }));

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) throw AppError.badRequest('currentPassword, newPassword and confirmPassword are required');
  if (newPassword !== confirmPassword) throw AppError.badRequest('Password confirmation does not match');
  if (!validatePassword(newPassword)) throw AppError.badRequest('New password must include uppercase, lowercase, number, special character, and be at least 8 characters');
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw AppError.unauthorized('User not found');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw AppError.unauthorized('Current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  await audit(req, 'password_changed', user, `Password changed: ${user.email}`);
  return sendResponse(res, 200, { message: 'Password changed successfully' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw AppError.badRequest('Email is required');

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user || !user.isActive) {
    return sendResponse(res, 200, { message: 'If this email exists, a reset code has been sent.' });
  }

  const devOtp = await createLoginOtpChallenge(user, req, 'otp', 'password-reset');
  return sendResponse(res, 200, {
    message: 'If this email exists, a reset code has been sent.',
    ...(devOtp ? { devOtp } : {}),
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword, confirmPassword } = req.body;
  if (!email || !code || !newPassword || !confirmPassword) throw AppError.badRequest('email, code, newPassword and confirmPassword are required');
  if (newPassword !== confirmPassword) throw AppError.badRequest('Password confirmation does not match');
  if (!validatePassword(newPassword)) throw AppError.badRequest('New password must include uppercase, lowercase, number, special character, and be at least 8 characters');

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash +loginOtpHash +loginOtpExpiresAt');
  if (!user || !user.isActive) throw AppError.unauthorized('Invalid or expired reset code');

  const ok = await verifyLoginOtp(user, code);
  if (!ok) {
    await audit(req, 'password_reset_failed', user, `Invalid password reset code for: ${user.email}`);
    throw AppError.unauthorized('Invalid or expired reset code');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();
  await audit(req, 'password_reset', user, `Password reset completed: ${user.email}`);
  return sendResponse(res, 200, { message: 'Password reset successfully. You can now login with your new password.' });
});

const setupMfa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+mfaTempSecret');
  if (!user) throw AppError.unauthorized('User not found');
  const secret = generateSecret();
  user.mfaTempSecret = secret;
  await user.save();
  const otpauthUrl = buildOtpAuthUrl({ account: user.email, secret });
  const qrCodeDataUrl = await buildQrCodeDataUrl(otpauthUrl);
  await audit(req, 'mfa_setup_started', user, `MFA setup started: ${user.email}`);
  return sendResponse(res, 200, { otpauthUrl, qrCodeDataUrl, manualEntryKey: secret });
});

const verifyMfaSetup = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) throw AppError.badRequest('code is required');
  const user = await User.findById(req.user._id).select('+mfaTempSecret +mfaSecret +mfaBackupCodes');
  if (!user || !user.mfaTempSecret) throw AppError.badRequest('MFA setup was not started');
  if (!verifyTotp(user.mfaTempSecret, code)) throw AppError.unauthorized('Invalid verification code');
  const backupCodes = generateBackupCodes();
  user.mfaEnabled = true;
  user.mfaSecret = user.mfaTempSecret;
  user.mfaTempSecret = null;
  user.mfaBackupCodes = await hashBackupCodes(backupCodes);
  user.mfaEnabledAt = new Date();
  await user.save();
  await audit(req, 'mfa_enabled', user, `MFA enabled: ${user.email}`);
  return sendResponse(res, 200, { message: 'MFA enabled successfully', backupCodes });
});

const disableMfa = asyncHandler(async (req, res) => {
  const { password, code } = req.body;
  if (!password || !code) throw AppError.badRequest('password and code are required');
  const user = await User.findById(req.user._id).select('+passwordHash +mfaSecret +mfaBackupCodes');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw AppError.unauthorized('Invalid password or verification code');
  if (!(await validateMfaCode(user, code))) throw AppError.unauthorized('Invalid password or verification code');
  user.mfaEnabled = false; user.mfaSecret = null; user.mfaTempSecret = null; user.mfaBackupCodes = []; user.mfaEnabledAt = null;
  await user.save();
  await audit(req, 'mfa_disabled', user, `MFA disabled: ${user.email}`);
  return sendResponse(res, 200, { message: 'MFA disabled successfully' });
});

const regenerateBackupCodes = asyncHandler(async (req, res) => {
  const { password, code } = req.body;
  if (!password || !code) throw AppError.badRequest('password and code are required');
  const user = await User.findById(req.user._id).select('+passwordHash +mfaSecret +mfaBackupCodes');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw AppError.unauthorized('Invalid password or verification code');
  if (!(await validateMfaCode(user, code))) throw AppError.unauthorized('Invalid password or verification code');
  const backupCodes = generateBackupCodes();
  user.mfaBackupCodes = await hashBackupCodes(backupCodes);
  await user.save();
  await audit(req, 'mfa_backup_codes_regenerated', user, `MFA backup codes regenerated: ${user.email}`);
  return sendResponse(res, 200, { message: 'Backup codes regenerated', backupCodes });
});

module.exports = { register, login, verifyLoginMfa, me, logout, changePassword, forgotPassword, resetPassword, setupMfa, verifyMfaSetup, disableMfa, regenerateBackupCodes };
