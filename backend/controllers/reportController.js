const fs = require('fs');
const path = require('path');

const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const AuditLog = require('../models/AuditLog');
const AnalysisResult = require('../models/AnalysisResult');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { assertObjectId } = require('../utils/validators');
const { createAuditLog } = require('../utils/auditLogger');
const { analyzeEvidence } = require('../utils/analysisEngine');
const { reportsDir, makeReportFilename, generateEvidencePdfReport, generateCasePdfReport } = require('../utils/reportGenerator');
const { assertCaseAccess, assertEvidenceAccess } = require('../utils/accessScope');

function rejectUnsafeFilename(filename) {
  if (!filename || path.basename(filename) !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw AppError.badRequest('Invalid report filename');
  }
  if (!/^[a-z0-9_.-]+\.pdf$/i.test(filename)) throw AppError.badRequest('Invalid report filename');
}
function reportPayload(filename, reportId) { return { reportId, reportName: filename, relativePath: `storage/reports/${filename}`, downloadUrl: `/api/reports/download/${filename}` }; }

function userIdOf(user) {
  return user?._id || user?.id || null;
}

function reportFileStat(dir, name) {
  const absolutePath = path.join(dir, name);
  if (!fs.existsSync(absolutePath)) return null;
  return fs.statSync(absolutePath);
}

async function findUserReportLog(req, filename) {
  return AuditLog.findOne({
    action: 'generate_report',
    actorId: userIdOf(req.user),
    'metadata.reportName': filename,
  }).sort({ createdAt: -1 }).lean();
}

function reportIdFromFilename(filename) {
  const match = String(filename).match(/(dec-\d{13}-[a-f0-9]{4})/i);
  return match ? match[1].toUpperCase() : null;
}

async function saveAutomaticAnalysis({ req, evidence }) {
  const result = analyzeEvidence(evidence);
  const saved = await AnalysisResult.create({
    evidenceId: evidence._id,
    caseId: evidence.caseId?._id || evidence.caseId || null,
    requestedBy: req.user._id,
    analysisType: result.analysisType || 'evidence',
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    indicators: result.indicators,
    summary: result.summary,
    recommendation: result.recommendation,
    rawInput: null,
  });

  await createAuditLog({
    req,
    action: 'analyze_evidence',
    message: `Automatic report analysis completed: ${evidence.title}`,
    caseId: evidence.caseId?._id || evidence.caseId || null,
    evidenceId: evidence._id,
    metadata: { automatic: true, riskScore: result.riskScore, riskLevel: result.riskLevel },
  });

  return saved;
}

async function getOrCreateEvidenceAnalysis(req, evidence) {
  const existing = await AnalysisResult.find({ evidenceId: evidence._id }).sort({ createdAt: -1 }).limit(10);
  if (existing.length) return existing;
  const created = await saveAutomaticAnalysis({ req, evidence });
  return [created];
}

async function ensureCaseAnalysis(req, evidenceItems) {
  const existing = await AnalysisResult.find({ evidenceId: { $in: evidenceItems.map((item) => item._id) } }).sort({ createdAt: -1 }).limit(300);
  const covered = new Set(existing.map((item) => String(item.evidenceId)));
  const created = [];

  for (const evidence of evidenceItems) {
    if (!covered.has(String(evidence._id))) {
      created.push(await saveAutomaticAnalysis({ req, evidence }));
    }
  }

  return [...created, ...existing].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const generateEvidenceReport = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');
  const evidence = await Evidence.findById(req.params.id).populate('caseId').populate('uploadedBy', 'fullName email role').populate('notes.createdBy', 'fullName email role');
  if (!evidence || evidence.status === 'deleted') throw AppError.notFound('Evidence not found');
  await assertEvidenceAccess(req.user, evidence);

  const analysis = await getOrCreateEvidenceAnalysis(req, evidence);
  const auditLogs = await AuditLog.find({ evidenceId: evidence._id })
    .populate('actorId', 'fullName email role')
    .populate('caseId', 'title status priority')
    .populate('evidenceId', 'title evidenceType status priority')
    .sort({ createdAt: -1 })
    .limit(75);

  const filename = makeReportFilename('evidence-report', evidence._id);
  const plannedReportId = reportIdFromFilename(filename);
  const { reportId } = await generateEvidencePdfReport({ filename, reportId: plannedReportId, generatedBy: req.user, caseData: evidence.caseId, evidenceData: evidence, auditLogs, analysis });

  await createAuditLog({ req, action: 'generate_report', message: `Evidence report generated: ${filename}`, caseId: evidence.caseId?._id || evidence.caseId, evidenceId: evidence._id, metadata: { reportId, reportName: filename, reportType: 'evidence', targetType: 'evidence', targetId: evidence._id } });
  return sendResponse(res, 201, reportPayload(filename, reportId));
});

const generateCaseReport = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'case id');
  const caseData = await Case.findById(req.params.id).populate('owner', 'fullName email role').populate('assignedUsers', 'fullName email role');
  if (!caseData) throw AppError.notFound('Case not found');
  await assertCaseAccess(req.user, caseData._id);

  const evidenceItems = await Evidence.find({ caseId: caseData._id, status: { $ne: 'deleted' } }).populate('uploadedBy', 'fullName email role').sort({ createdAt: -1 }).limit(250);
  const analysis = await ensureCaseAnalysis(req, evidenceItems);
  const auditLogs = await AuditLog.find({ caseId: caseData._id })
    .populate('actorId', 'fullName email role')
    .populate('caseId', 'title status priority')
    .populate('evidenceId', 'title evidenceType status priority')
    .sort({ createdAt: -1 })
    .limit(120);

  const filename = makeReportFilename('case-report', caseData._id);
  const plannedReportId = reportIdFromFilename(filename);
  const { reportId } = await generateCasePdfReport({ filename, reportId: plannedReportId, generatedBy: req.user, caseData, evidenceItems, auditLogs, analysis });
  await createAuditLog({ req, action: 'generate_report', message: `Case report generated: ${filename}`, caseId: caseData._id, metadata: { reportId, reportName: filename, reportType: 'case', targetType: 'case', targetId: caseData._id } });
  return sendResponse(res, 201, reportPayload(filename, reportId));
});

const listReports = asyncHandler(async (req, res) => {
  const dir = reportsDir();
  fs.mkdirSync(dir, { recursive: true });

  const reportNames = fs
    .readdirSync(dir)
    .filter((name) => /^[a-z0-9_.-]+\.pdf$/i.test(name));

  if (!reportNames.length) {
    return sendResponse(res, 200, []);
  }

  const logs = await AuditLog.find({
    action: 'generate_report',
    actorId: userIdOf(req.user),
    'metadata.reportName': { $in: reportNames },
  })
    .sort({ createdAt: -1 })
    .lean();

  const seen = new Set();
  const reports = [];

  for (const log of logs) {
    const reportName = String(log.metadata?.reportName || '').trim();
    if (!reportName || seen.has(reportName)) continue;

    const stat = reportFileStat(dir, reportName);
    if (!stat) continue;

    seen.add(reportName);
    reports.push({
      reportId: log.metadata?.reportId || undefined,
      reportName,
      size: stat.size,
      createdAt: log.createdAt || stat.birthtime,
      downloadUrl: `/api/reports/download/${reportName}`,
    });
  }

  return sendResponse(res, 200, reports);
});

const downloadReport = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  rejectUnsafeFilename(filename);

  const reportLog = await findUserReportLog(req, filename);
  if (!reportLog) throw AppError.notFound('Report not found');

  const dir = reportsDir();
  const absolutePath = path.resolve(dir, filename);
  if (!absolutePath.startsWith(path.resolve(dir) + path.sep) || !fs.existsSync(absolutePath)) {
    throw AppError.notFound('Report not found');
  }

  return res.download(absolutePath, filename);
});

module.exports = { generateEvidenceReport, generateCaseReport, listReports, downloadReport };
