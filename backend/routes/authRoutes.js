const express = require('express');
const { register, login, verifyLoginMfa, me, logout, changePassword, forgotPassword, resetPassword, setupMfa, verifyMfaSetup, disableMfa, regenerateBackupCodes } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { createRateLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

function ipKey(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function emailKey(req) {
  return String(req.body?.email || 'unknown').trim().toLowerCase() || 'unknown';
}

const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
const mfaLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 10 });
const otpIpLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.OTP_IP_MAX_PER_HOUR || 20),
  keyGenerator: (req) => `otp-ip:${ipKey(req)}`,
  message: 'Too many OTP requests from this network. Try again later.',
});
const otpEmailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.OTP_EMAIL_REQUEST_MAX_PER_HOUR || 6),
  keyGenerator: (req) => `otp-email:${emailKey(req)}`,
  message: 'Too many OTP requests for this email. Try again later.',
});

router.post('/register', authLimiter, otpIpLimiter, otpEmailLimiter, register);
router.post('/login', authLimiter, otpIpLimiter, otpEmailLimiter, login);
router.post('/login/verify-mfa', mfaLimiter, verifyLoginMfa);
router.get('/me', protect, me);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', authLimiter, otpIpLimiter, otpEmailLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/mfa/setup', protect, setupMfa);
router.post('/mfa/verify', protect, verifyMfaSetup);
router.post('/mfa/disable', protect, disableMfa);
router.post('/mfa/backup-codes/regenerate', protect, regenerateBackupCodes);

module.exports = router;
