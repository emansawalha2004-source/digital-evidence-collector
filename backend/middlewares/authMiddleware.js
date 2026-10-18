const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

async function getDevelopmentUser() {
  let user = await User.findOne({ role: 'admin', isActive: true });
  if (!user) user = await User.findOne({ isActive: true });
  return user;
}

async function protect(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_FALLBACK === 'true') {
        const devUser = await getDevelopmentUser();
        if (devUser) { req.user = devUser; return next(); }
      }
      throw AppError.unauthorized('Authentication token is required');
    }
    const decoded = verifyToken(token);
    if (decoded.purpose && decoded.purpose !== 'access') throw AppError.unauthorized('MFA token cannot access protected APIs');
    const userId = decoded.userId || decoded.id || decoded._id;
    if (!userId) throw AppError.unauthorized('Invalid token payload');
    const user = await User.findById(userId);
    if (!user || !user.isActive) throw AppError.unauthorized('User is not active or does not exist');
    req.user = user;
    return next();
  } catch (error) {
    return next(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.message === 'Invalid token purpose'
      ? AppError.unauthorized('Invalid or expired token')
      : error);
  }
}

function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) return next(AppError.unauthorized('Authentication is required'));
    if (!allowedRoles.includes(req.user.role)) return next(AppError.forbidden('You do not have permission to perform this action'));
    return next();
  };
}

module.exports = { protect, requireRole };
