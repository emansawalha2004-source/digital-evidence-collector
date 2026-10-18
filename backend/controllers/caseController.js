const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const AuditLog = require('../models/AuditLog');

const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { createAuditLog } = require('../utils/auditLogger');
const { getUserId, isAdmin, caseAccessFilter, mergeFilters, assertCaseAccess } = require('../utils/accessScope');
const { inferCasePriority, refreshCasePriority } = require('../utils/priorityModel');

const {
  assertObjectId,
  parsePagination,
  parseTags,
  requireFields,
  assertEnum,
  buildTextSearchFilter,
} = require('../utils/validators');

const { CASE_STATUSES, CASE_PRIORITIES } = require('../models/Case');

// إنشاء قضية جديدة
const createCase = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title']);

  assertEnum(req.body.status, CASE_STATUSES, 'status');

  const tags = parseTags(req.body.tags);
  const priority = inferCasePriority({
    title: req.body.title,
    description: req.body.description,
    tags,
  });

  const assignedUsers = Array.isArray(req.body.assignedUsers) ? req.body.assignedUsers : [];

  assignedUsers.forEach((userId) => assertObjectId(userId, 'assignedUsers'));

  const createdCase = await Case.create({
    title: req.body.title,
    description: req.body.description || '',
    status: req.body.status || 'open',
    priority,
    owner: isAdmin(req.user) && req.body.owner ? req.body.owner : getUserId(req.user),
    assignedUsers,
    tags,
  });

  await createAuditLog({
    req,
    action: 'create_case',
    message: `Case created: ${createdCase.title}`,
    caseId: createdCase._id,
    metadata: {
      title: createdCase.title,
      status: createdCase.status,
      priority: createdCase.priority,
      prioritySource: 'analysis_model',
    },
  });

  return sendResponse(res, 201, createdCase);
});

// عرض القضايا مع بحث وفلترة
const getCases = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const filter = {
    ...buildTextSearchFilter(req.query.search),
  };

  if (req.query.status) {
    assertEnum(req.query.status, CASE_STATUSES, 'status');
    filter.status = req.query.status;
  }

  if (req.query.priority) {
    assertEnum(req.query.priority, CASE_PRIORITIES, 'priority');
    filter.priority = req.query.priority;
  }

  if (req.query.owner) {
    assertObjectId(req.query.owner, 'owner');
    filter.owner = req.query.owner;
  }

  if (req.query.tag) {
    filter.tags = String(req.query.tag).trim().toLowerCase();
  }

  const scopedFilter = mergeFilters(filter, caseAccessFilter(req.user));

  const [items, total] = await Promise.all([
    Case.find(scopedFilter)
      .populate('owner', 'fullName email role')
      .populate('assignedUsers', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Case.countDocuments(scopedFilter),
  ]);

  return sendResponse(
    res,
    200,
    items,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

// عرض قضية واحدة
const getCaseById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'case id');

  const foundCase = await Case.findById(req.params.id)
    .populate('owner', 'fullName email role')
    .populate('assignedUsers', 'fullName email role');

  if (!foundCase) {
    throw AppError.notFound('Case not found');
  }
  await assertCaseAccess(req.user, req.params.id);

  return sendResponse(res, 200, foundCase);
});

// تعديل قضية
const updateCase = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'case id');

  const foundCase = await Case.findById(req.params.id);

  if (!foundCase) {
    throw AppError.notFound('Case not found');
  }
  await assertCaseAccess(req.user, req.params.id);

  if (req.body.status) {
    assertEnum(req.body.status, CASE_STATUSES, 'status');
    foundCase.status = req.body.status;
  }

  if (req.body.title !== undefined) {
    foundCase.title = req.body.title;
  }

  if (req.body.description !== undefined) {
    foundCase.description = req.body.description;
  }

  if (req.body.assignedUsers !== undefined) {
    if (!Array.isArray(req.body.assignedUsers)) {
      throw AppError.badRequest('assignedUsers must be an array');
    }

    req.body.assignedUsers.forEach((userId) => assertObjectId(userId, 'assignedUsers'));
    foundCase.assignedUsers = req.body.assignedUsers;
  }

  if (req.body.tags !== undefined) {
    foundCase.tags = parseTags(req.body.tags);
  }

  if (req.body.title !== undefined || req.body.description !== undefined || req.body.tags !== undefined) {
    foundCase.priority = inferCasePriority({
      title: foundCase.title,
      description: foundCase.description,
      tags: foundCase.tags,
    });
  }

  await foundCase.save();
  const refreshedPriority = await refreshCasePriority(foundCase._id);
  if (refreshedPriority) {
    foundCase.priority = refreshedPriority;
  }

  await createAuditLog({
    req,
    action: 'update_case',
    message: `Case updated: ${foundCase.title}`,
    caseId: foundCase._id,
    metadata: {
      updatedFields: Object.keys(req.body),
    },
  });

  return sendResponse(res, 200, foundCase);
});

// أرشفة القضية بدل حذفها نهائياً
const archiveCase = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'case id');

  const foundCase = await Case.findById(req.params.id);

  if (!foundCase) {
    throw AppError.notFound('Case not found');
  }
  await assertCaseAccess(req.user, req.params.id);

  foundCase.status = 'archived';
  await foundCase.save();

  await createAuditLog({
    req,
    action: 'update_case',
    message: `Case archived: ${foundCase.title}`,
    caseId: foundCase._id,
  });

  return sendResponse(res, 200, foundCase);
});

// أدلة قضية محددة
const getCaseEvidence = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'case id');

  const foundCase = await Case.findById(req.params.id);

  if (!foundCase) {
    throw AppError.notFound('Case not found');
  }
  await assertCaseAccess(req.user, req.params.id);

  const { page, limit, skip } = parsePagination(req.query);

  const filter = {
    caseId: req.params.id,
  };

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [items, total] = await Promise.all([
    Evidence.find(filter)
      .populate('uploadedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Evidence.countDocuments(filter),
  ]);

  return sendResponse(
    res,
    200,
    items,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

// timeline لقضية محددة
const getCaseTimeline = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'case id');
  await assertCaseAccess(req.user, req.params.id);

  const { page, limit, skip } = parsePagination(req.query);

  const [items, total] = await Promise.all([
    AuditLog.find({ caseId: req.params.id })
      .populate('actorId', 'fullName email role')
      .populate('evidenceId', 'title evidenceType status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments({ caseId: req.params.id }),
  ]);

  return sendResponse(
    res,
    200,
    items,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }
  );
});

// إحصائيات قضية واحدة
const getCaseStats = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'case id');
  await assertCaseAccess(req.user, req.params.id);

  const foundCase = await Case.findById(req.params.id);

  if (!foundCase) {
    throw AppError.notFound('Case not found');
  }

  const [
    totalEvidence,
    activeEvidence,
    archivedEvidence,
    deletedEvidence,
    evidenceByType,
    evidenceByPriority,
    timelineCount,
  ] = await Promise.all([
    Evidence.countDocuments({ caseId: req.params.id }),
    Evidence.countDocuments({ caseId: req.params.id, status: 'active' }),
    Evidence.countDocuments({ caseId: req.params.id, status: 'archived' }),
    Evidence.countDocuments({ caseId: req.params.id, status: 'deleted' }),
    Evidence.aggregate([
      { $match: { caseId: foundCase._id } },
      { $group: { _id: '$evidenceType', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } },
    ]),
    Evidence.aggregate([
      { $match: { caseId: foundCase._id } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $project: { _id: 0, priority: '$_id', count: 1 } },
    ]),
    AuditLog.countDocuments({ caseId: req.params.id }),
  ]);

  return sendResponse(res, 200, {
    case: foundCase,
    totalEvidence,
    activeEvidence,
    archivedEvidence,
    deletedEvidence,
    evidenceByType,
    evidenceByPriority,
    timelineCount,
  });
});

module.exports = {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  archiveCase,
  getCaseEvidence,
  getCaseTimeline,
  getCaseStats,
};