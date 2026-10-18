const mongoose = require('mongoose');
const AppError = require('./AppError');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function assertObjectId(id, fieldName = 'id') {
  if (!isValidObjectId(id)) {
    throw AppError.badRequest(`Invalid ${fieldName}`);
  }
}

function parsePagination(query = {}) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const rawLimit = Number.parseInt(query.limit, 10) || 20;
  const limit = Math.min(Math.max(rawLimit, 1), 100);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
}

function parseTags(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
  }

  if (typeof value === 'string') {
    return [
      ...new Set(
        value
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
      ),
    ];
  }

  return [];
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body[field];

    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw AppError.badRequest('Missing required fields', { missing });
  }
}

function assertEnum(value, allowedValues, fieldName) {
  if (value !== undefined && value !== null && value !== '' && !allowedValues.includes(value)) {
    throw AppError.badRequest(`Invalid ${fieldName}`, {
      field: fieldName,
      allowedValues,
    });
  }
}

function buildTextSearchFilter(search) {
  if (!search || !String(search).trim()) {
    return {};
  }

  return {
    $text: {
      $search: String(search).trim(),
    },
  };
}

module.exports = {
  isValidObjectId,
  assertObjectId,
  parsePagination,
  parseTags,
  requireFields,
  assertEnum,
  buildTextSearchFilter,
};