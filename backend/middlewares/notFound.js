const AppError = require('../utils/AppError');

// هذا الميدلوير يمسك أي Route غير موجود
function notFound(req, res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;