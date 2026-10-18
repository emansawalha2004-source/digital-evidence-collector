const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const AuditLog = require('../models/AuditLog');

const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { caseAccessFilter, evidenceAccessFilter, timelineAccessFilter, mergeFilters, isAdmin } = require('../utils/accessScope');

const getDashboard = asyncHandler(async (req, res) => {
  const scopedCases = caseAccessFilter(req.user);
  const scopedEvidence = await evidenceAccessFilter(req.user);
  const scopedTimeline = isAdmin(req.user) ? await timelineAccessFilter(req.user) : null;

  const activeEvidenceFilter = mergeFilters(scopedEvidence, { status: 'active' });
  const archivedEvidenceFilter = mergeFilters(scopedEvidence, { status: 'archived' });
  const visibleEvidenceFilter = mergeFilters(scopedEvidence, { status: { $ne: 'deleted' } });

  const [
    totalCases,
    openCases,
    totalEvidence,
    activeEvidence,
    archivedEvidence,
    evidenceByType,
    evidenceByPriority,
    recentEvidence,
    recentTimeline,
  ] = await Promise.all([
    Case.countDocuments(scopedCases),
    Case.countDocuments(mergeFilters(scopedCases, { status: 'open' })),
    Evidence.countDocuments(scopedEvidence),
    Evidence.countDocuments(activeEvidenceFilter),
    Evidence.countDocuments(archivedEvidenceFilter),
    Evidence.aggregate([
      { $match: visibleEvidenceFilter },
      { $group: { _id: '$evidenceType', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Evidence.aggregate([
      { $match: visibleEvidenceFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $project: { _id: 0, priority: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Evidence.find(visibleEvidenceFilter)
      .populate('caseId', 'title status priority')
      .populate('uploadedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(8),
    scopedTimeline
      ? AuditLog.find(scopedTimeline)
        .populate('actorId', 'fullName email role')
        .populate('caseId', 'title status priority')
        .populate('evidenceId', 'title evidenceType status priority')
        .sort({ createdAt: -1 })
        .limit(10)
      : Promise.resolve([]),
  ]);

  return sendResponse(res, 200, {
    totalCases,
    openCases,
    totalEvidence,
    activeEvidence,
    archivedEvidence,
    evidenceByType,
    evidenceByPriority,
    recentEvidence,
    recentTimeline,
  });
});

module.exports = { getDashboard };
