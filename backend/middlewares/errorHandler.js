const AppError = require('../utils/AppError');

function normalizeValidationError(error) {
  return Object.values(error.errors || {}).map((item) => ({
    field: item.path,
    message: item.message,
  }));
}

function normalizeDuplicateKeyError(error) {
  return Object.keys(error.keyValue || {}).map((field) => ({
    field,
    message: `${field} already exists`,
    value: error.keyValue[field],
  }));
}

// معالجة مركزية لكل أخطاء النظام
function errorHandler(error, req, res, next) {
  let normalizedError = error;

  if (error.name === 'ValidationError') {
    normalizedError = AppError.badRequest('Validation failed', normalizeValidationError(error));
  }

  if (error.name === 'CastError') {
    normalizedError = AppError.badRequest('Invalid identifier', {
      field: error.path,
      value: error.value,
    });
  }

  if (error.code === 11000) {
    normalizedError = AppError.conflict('Duplicate value', normalizeDuplicateKeyError(error));
  }

  if (error.name === 'JsonWebTokenError') {
    normalizedError = AppError.unauthorized('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    normalizedError = AppError.unauthorized('Token expired');
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    normalizedError = AppError.payloadTooLarge('Uploaded file is too large');
  }

  const statusCode = normalizedError.statusCode || 500;

  const payload = {
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : normalizedError.message || 'Internal server error',
  };

  if (normalizedError.details) {
    payload.details = normalizedError.details;
  }

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = normalizedError.stack;
  }

  return res.status(statusCode).json(payload);
}

module.exports = errorHandler;