const jwt = require('jsonwebtoken');

function requireSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function signToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role, purpose: 'access' }, requireSecret('JWT_SECRET'), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function verifyToken(token) {
  const payload = jwt.verify(token, requireSecret('JWT_SECRET'));
  if (payload.purpose && payload.purpose !== 'access') throw new Error('Invalid token purpose');
  return payload;
}

function signMfaToken(user) {
  return jwt.sign({ userId: user._id.toString(), purpose: 'mfa' }, process.env.MFA_JWT_SECRET || requireSecret('JWT_SECRET'), { expiresIn: process.env.MFA_TOKEN_EXPIRES_IN || '5m' });
}

function verifyMfaToken(token) {
  const payload = jwt.verify(token, process.env.MFA_JWT_SECRET || requireSecret('JWT_SECRET'));
  if (payload.purpose !== 'mfa') throw new Error('Invalid MFA token');
  return payload;
}

module.exports = { signToken, verifyToken, signMfaToken, verifyMfaToken };
