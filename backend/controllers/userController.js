const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { assertObjectId, parsePagination, buildTextSearchFilter } = require('../utils/validators');
const { USER_ROLES } = require('../models/User');

function isSameUser(req, userId) {
  return String(req.user?._id || req.user?.id) === String(userId);
}

async function countActiveAdmins(excludedUserId = null) {
  const filter = { role: 'admin', isActive: true };
  if (excludedUserId) filter._id = { $ne: excludedUserId };
  return User.countDocuments(filter);
}

const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { ...buildTextSearchFilter(req.query.search) };

  if (req.query.role) {
    if (!USER_ROLES.includes(req.query.role)) throw AppError.badRequest('Invalid role');
    filter.role = req.query.role;
  }

  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return sendResponse(res, 200, items, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getUserById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'user id');
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');
  return sendResponse(res, 200, user);
});

const updateUserRole = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'user id');
  const { role } = req.body;

  if (!USER_ROLES.includes(role)) {
    throw AppError.badRequest('Invalid role', { allowedRoles: USER_ROLES });
  }

  if (isSameUser(req, req.params.id)) {
    throw AppError.forbidden('You cannot change your own role');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');

  if (user.role === 'admin' && role !== 'admin' && user.isActive) {
    const remainingAdmins = await countActiveAdmins(user._id);
    if (remainingAdmins < 1) throw AppError.badRequest('Cannot remove the last active admin');
  }

  user.role = role;
  await user.save();

  return sendResponse(res, 200, user);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'user id');
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw AppError.badRequest('isActive boolean is required');
  }

  if (isSameUser(req, req.params.id)) {
    throw AppError.forbidden('You cannot change your own status');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');

  if (user.role === 'admin' && user.isActive && isActive === false) {
    const remainingAdmins = await countActiveAdmins(user._id);
    if (remainingAdmins < 1) throw AppError.badRequest('Cannot disable the last active admin');
  }

  user.isActive = isActive;
  await user.save();

  return sendResponse(res, 200, user);
});

module.exports = { getUsers, getUserById, updateUserRole, updateUserStatus };
