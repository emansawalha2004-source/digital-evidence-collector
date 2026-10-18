const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value = '') {
  const clean = String(value).replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret);
  const buffer = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  buffer.writeUInt32BE(high, 0);
  buffer.writeUInt32BE(low, 4);
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
}

function verifyTotp(secret, code, window = 1) {
  const normalized = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized) || !secret) return false;
  const step = 30;
  const current = Math.floor(Date.now() / 1000 / step);
  for (let drift = -window; drift <= window; drift += 1) {
    const expected = hotp(secret, current + drift);
    const a = Buffer.from(expected);
    const b = Buffer.from(normalized);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

function buildOtpAuthUrl({ issuer = 'Digital Evidence System', account, secret }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' });
  return `otpauth://totp/${label}?${params.toString()}`;
}

async function buildQrCodeDataUrl(otpauthUrl) {
  try {
    // Optional dependency. Installed through package.json; fallback keeps the flow usable if install was not run yet.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const QRCode = require('qrcode');
    return await QRCode.toDataURL(otpauthUrl, { errorCorrectionLevel: 'M', margin: 1, width: 220 });
  } catch {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260"><rect width="100%" height="100%" fill="white"/><rect x="20" y="20" width="220" height="220" fill="#f3f4f6" stroke="#3b22d6"/><text x="130" y="118" text-anchor="middle" font-size="14" font-family="Arial" fill="#24118f">QR package missing</text><text x="130" y="146" text-anchor="middle" font-size="11" font-family="Arial" fill="#374151">Use manual key below</text></svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
}

function normalizeBackupCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

function generateBackupCodes(count = 10) {
  return Array.from({ length: count }, () => `${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`);
}

async function hashBackupCodes(codes) {
  return Promise.all(codes.map(async (code) => ({ codeHash: await bcrypt.hash(normalizeBackupCode(code), 12), used: false, usedAt: null })));
}

async function verifyBackupCode(user, code) {
  const normalized = normalizeBackupCode(code);
  if (!normalized || !Array.isArray(user.mfaBackupCodes)) return false;
  for (const backup of user.mfaBackupCodes) {
    if (backup.used) continue;
    // eslint-disable-next-line no-await-in-loop
    const matches = await bcrypt.compare(normalized, backup.codeHash);
    if (matches) {
      backup.used = true;
      backup.usedAt = new Date();
      return true;
    }
  }
  return false;
}

module.exports = { generateSecret, verifyTotp, buildOtpAuthUrl, buildQrCodeDataUrl, generateBackupCodes, hashBackupCodes, verifyBackupCode };
