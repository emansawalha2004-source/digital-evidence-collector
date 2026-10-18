const mongoose = require('mongoose');
const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const AppError = require('./AppError');

function normalizeObjectId(value) {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return mongoose.Types.ObjectId.isValid(trimmed) ? trimmed : null;
  }

  if (typeof value.toHexString === 'function') {
    const hexValue = value.toHexString();
    return mongoose.Types.ObjectId.isValid(hexValue) ? hexValue : null;
  }

  if (value._id && value._id !== value) {
    return normalizeObjectId(value._id);
  }

  if (value.id && value.id !== value) {
    return normalizeObjectId(value.id);
  }

  if (typeof value.toString === 'function') {
    const stringValue = value.toString();
    return mongoose.Types.ObjectId.isValid(stringValue) ? stringValue : null;
  }

  return null;
}

function getUserId(user) {
  return normalizeObjectId(user);
}

function isAdmin(user) {
  return user?.role === 'admin';
}

function caseAccessFilter(user) {
  if (isAdmin(user)) return {};
  const userId = getUserId(user);
  return { $or: [{ owner: userId }, { assignedUsers: userId }] };
}

async function getAccessibleCaseIds(user) {
  if (isAdmin(user)) return null;
  const items = await Case.find(caseAccessFilter(user)).select('_id').lean();
  return items.map((item) => item._id);
}

async function evidenceAccessFilter(user) {
  if (isAdmin(user)) return {};
  const userId = getUserId(user);
  const caseIds = await getAccessibleCaseIds(user);
  return { $or: [{ uploadedBy: userId }, { caseId: { $in: caseIds } }] };
}

async function timelineAccessFilter(user) {
  if (isAdmin(user)) return {};
  const userId = getUserId(user);
  const caseIds = await getAccessibleCaseIds(user);
  const evidenceIds = await Evidence.find({ $or: [{ uploadedBy: userId }, { caseId: { $in: caseIds } }] }).select('_id').lean();
  return {
    $or: [
      { actorId: userId },
      { caseId: { $in: caseIds } },
      { evidenceId: { $in: evidenceIds.map((item) => item._id) } },
    ],
  };
}

function mergeFilters(...filters) {
  const clean = filters.filter((filter) => filter && Object.keys(filter).length);
  if (clean.length === 0) return {};
  if (clean.length === 1) return clean[0];
  return { $and: clean };
}

async function assertCaseAccess(user, caseId) {
  const normalizedCaseId = normalizeObjectId(caseId);
  if (!normalizedCaseId) throw AppError.badRequest('Invalid case id');
  if (isAdmin(user)) return;
  const found = await Case.exists({ _id: normalizedCaseId, ...caseAccessFilter(user) });
  if (!found) throw AppError.forbidden('You do not have access to this case');
}

async function assertEvidenceAccess(user, evidence) {
  if (isAdmin(user)) return;

  const userId = getUserId(user);
  const uploadedById = normalizeObjectId(evidence?.uploadedBy);

  if (userId && uploadedById && String(uploadedById) === String(userId)) return;

  await assertCaseAccess(user, evidence?.caseId);
}

module.exports = {
  getUserId,
  isAdmin,
  caseAccessFilter,
  getAccessibleCaseIds,
  evidenceAccessFilter,
  timelineAccessFilter,
  mergeFilters,
  assertCaseAccess,
  assertEvidenceAccess,
};
