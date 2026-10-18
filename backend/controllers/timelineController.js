const AuditLog = require('../models/AuditLog');

const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

const {
  assertObjectId,
  parsePagination,
  assertEnum,
} = require('../utils/validators');

const { AUDIT_ACTIONS } = require('../models/AuditLog');
const { timelineAccessFilter, mergeFilters, assertCaseAccess, assertEvidenceAccess } = require('../utils/accessScope');
const Evidence = require('../models/Evidence');

// تجهيز فلتر الـ timeline
function buildTimelineFilter(query) {
  const filter = {};

  if (query.action) {
    assertEnum(query.action, AUDIT_ACTIONS, 'action');
    filter.action = query.action;
  }

  if (query.actorId) {
    assertObjectId(query.actorId, 'actorId');
    filter.actorId = query.actorId;
  }

  if (query.caseId) {
    assertObjectId(query.caseId, 'caseId');
    filter.caseId = query.caseId;
  }

  if (query.evidenceId) {
    assertObjectId(query.evidenceId, 'evidenceId');
    filter.evidenceId = query.evidenceId;
  }

  return filter;
}

// عرض كل أحداث النظام
const getTimeline = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = mergeFilters(buildTimelineFilter(req.query), await timelineAccessFilter(req.user));

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'fullName email role')
      .populate('caseId', 'title status priority')
      .populate('evidenceId', 'title evidenceType status priority')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
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

// timeline لدليل محدد
const getEvidenceTimeline = asyncHandler(async (req, res) => {
  assertObjectId(req.params.evidenceId, 'evidenceId');

  const { page, limit, skip } = parsePagination(req.query);

  const evidence = await Evidence.findById(req.params.evidenceId);
  if (!evidence) {
    return sendResponse(res, 200, [], { page, limit, total: 0, pages: 0 });
  }
  await assertEvidenceAccess(req.user, evidence);

  const filter = {
    evidenceId: req.params.evidenceId,
  };

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'fullName email role')
      .populate('caseId', 'title status priority')
      .populate('evidenceId', 'title evidenceType status priority')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
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
  assertObjectId(req.params.caseId, 'caseId');
  await assertCaseAccess(req.user, req.params.caseId);

  const { page, limit, skip } = parsePagination(req.query);

  const filter = {
    caseId: req.params.caseId,
  };

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'fullName email role')
      .populate('caseId', 'title status priority')
      .populate('evidenceId', 'title evidenceType status priority')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
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

module.exports = {
  getTimeline,
  getEvidenceTimeline,
  getCaseTimeline,
};