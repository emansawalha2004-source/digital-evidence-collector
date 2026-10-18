const AppError = require('../utils/AppError');

function defaultKey(req) {
  return `${req.ip || req.connection?.remoteAddress || 'unknown'}:${req.originalUrl.split('?')[0]}`;
}

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, keyGenerator = defaultKey, message = 'Too many attempts. Try again later.' } = {}) {
  const hits = new Map();
  return function rateLimiter(req, res, next) {
    const key = keyGenerator(req) || defaultKey(req);
    const now = Date.now();
    const current = hits.get(key) || { count: 0, resetAt: now + windowMs };
    if (current.resetAt <= now) { current.count = 0; current.resetAt = now + windowMs; }
    current.count += 1;
    hits.set(key, current);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));
    if (current.count > max) return next(AppError.tooManyRequests(message));
    return next();
  };
}

module.exports = { createRateLimiter };
