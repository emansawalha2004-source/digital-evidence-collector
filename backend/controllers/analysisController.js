const Evidence = require('../models/Evidence');
const AnalysisResult = require('../models/AnalysisResult');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { assertObjectId } = require('../utils/validators');
const { createAuditLog } = require('../utils/auditLogger');
const { analyzeText, analyzeLink, analyzeEvidence } = require('../utils/analysisEngine');
const { assertEvidenceAccess } = require('../utils/accessScope');

async function persistResult({ req, evidence = null, analysisType, result, rawInput, action }) {
  const document = await AnalysisResult.create({
    evidenceId: evidence?._id || null,
    caseId: evidence?.caseId || null,
    requestedBy: req.user._id,
    analysisType,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel,
    indicators: result.indicators,
    summary: result.summary,
    recommendation: result.recommendation,
    rawInput,
  });

  await createAuditLog({
    req,
    action,
    message: `${action.replace('_', ' ')} completed`,
    caseId: evidence?.caseId || null,
    evidenceId: evidence?._id || null,
    metadata: { riskScore: result.riskScore, riskLevel: result.riskLevel },
  });

  return document;
}

const analyzeTextInput = asyncHandler(async (req, res) => {
  if (!req.body.text) throw AppError.badRequest('text is required');
  const result = analyzeText(req.body.text);
  const saved = await persistResult({ req, analysisType: 'text', result, rawInput: req.body.text, action: 'analyze_text' });
  return sendResponse(res, 201, saved);
});

const analyzeLinkInput = asyncHandler(async (req, res) => {
  if (!req.body.url) throw AppError.badRequest('url is required');
  const result = analyzeLink(req.body.url);
  const saved = await persistResult({ req, analysisType: 'link', result, rawInput: req.body.url, action: 'analyze_link' });
  return sendResponse(res, 201, saved);
});

const analyzeEvidenceById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');
  const evidence = await Evidence.findById(req.params.id);
  if (!evidence || evidence.status === 'deleted') throw AppError.notFound('Evidence not found');
  await assertEvidenceAccess(req.user, evidence);
  const result = analyzeEvidence(evidence);
  const saved = await persistResult({ req, evidence, analysisType: 'evidence', result, rawInput: null, action: 'analyze_evidence' });
  return sendResponse(res, 201, saved);
});

const getEvidenceAnalysisHistory = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');
  const evidence = await Evidence.findById(req.params.id);
  if (!evidence || evidence.status === 'deleted') throw AppError.notFound('Evidence not found');
  await assertEvidenceAccess(req.user, evidence);

  const history = await AnalysisResult.find({ evidenceId: req.params.id })
    .populate('requestedBy', 'fullName email role')
    .sort({ createdAt: -1 })
    .limit(50);
  return sendResponse(res, 200, history);
});

module.exports = { analyzeTextInput, analyzeLinkInput, analyzeEvidenceById, getEvidenceAnalysisHistory };
