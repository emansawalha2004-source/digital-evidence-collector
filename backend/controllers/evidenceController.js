const fs = require('fs');
const path = require('path');

const Case = require('../models/Case');
const Evidence = require('../models/Evidence');

const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { createAuditLog } = require('../utils/auditLogger');
const {
  assertCaseAccess,
  assertEvidenceAccess,
  evidenceAccessFilter,
  mergeFilters,
} = require('../utils/accessScope');
const { inferEvidencePriority, refreshCasePriority } = require('../utils/priorityModel');

const {
  assertObjectId,
  parsePagination,
  parseTags,
  requireFields,
  assertEnum,
  buildTextSearchFilter,
} = require('../utils/validators');

const {
  calculateSha256,
  getRelativeStoragePath,
  resolveRelativeStoragePath,
} = require('../utils/fileUtils');

const uploadMiddleware = require('../middlewares/uploadMiddleware');

const {
  EVIDENCE_TYPES = ['file', 'text', 'link', 'image', 'video', 'audio', 'document', 'other'],
  FILE_EVIDENCE_TYPES = ['file', 'image', 'video', 'audio', 'document', 'other'],
  CONTENT_EVIDENCE_TYPES = ['text', 'link'],
  EVIDENCE_STATUSES,
  EVIDENCE_PRIORITIES,
} = Evidence;

function fallbackEvidenceTypeFromFile(file) {
  const mimeType = String(file?.mimetype || '').toLowerCase();
  const extension = path.extname(file?.originalname || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  if (
    ['.pdf', '.txt', '.doc', '.docx', '.csv', '.json', '.xlsx', '.xls', '.ppt', '.pptx'].includes(extension)
  ) {
    return 'document';
  }

  return 'file';
}

const getEvidenceTypeFromFile =
  typeof uploadMiddleware.getEvidenceTypeFromFile === 'function'
    ? uploadMiddleware.getEvidenceTypeFromFile
    : fallbackEvidenceTypeFromFile;

function hasStoredFile(evidence) {
  return FILE_EVIDENCE_TYPES.includes(evidence?.evidenceType) && Boolean(evidence?.file?.relativePath);
}

function getFileResponseName(evidence, absolutePath) {
  return evidence.file?.originalName || evidence.file?.storedName || path.basename(absolutePath);
}

function buildEvidenceFilter(query) {
  const filter = {
    ...buildTextSearchFilter(query.search),
  };

  if (query.caseId) {
    assertObjectId(query.caseId, 'caseId');
    filter.caseId = query.caseId;
  }

  if (query.status) {
    assertEnum(query.status, EVIDENCE_STATUSES, 'status');
    filter.status = query.status;
  }

  if (query.type) {
    assertEnum(query.type, EVIDENCE_TYPES, 'type');
    filter.evidenceType = query.type;
  }

  if (query.evidenceType) {
    assertEnum(query.evidenceType, EVIDENCE_TYPES, 'evidenceType');
    filter.evidenceType = query.evidenceType;
  }

  if (query.priority) {
    assertEnum(query.priority, EVIDENCE_PRIORITIES, 'priority');
    filter.priority = query.priority;
  }

  if (query.tag) {
    filter.tags = String(query.tag).trim().toLowerCase();
  }

  return filter;
}

const createEvidence = asyncHandler(async (req, res) => {
  requireFields(req.body, ['caseId', 'title', 'evidenceType', 'content']);

  assertObjectId(req.body.caseId, 'caseId');
  assertEnum(req.body.evidenceType, CONTENT_EVIDENCE_TYPES, 'evidenceType');
  assertEnum(req.body.status, EVIDENCE_STATUSES, 'status');

  const foundCase = await Case.findById(req.body.caseId);

  if (!foundCase) {
    throw AppError.notFound('Case not found');
  }

  await assertCaseAccess(req.user, req.body.caseId);

  const priority = inferEvidencePriority({
    evidenceType: req.body.evidenceType,
    content: req.body.content,
  });

  const evidence = await Evidence.create({
    caseId: req.body.caseId,
    uploadedBy: req.user?._id || req.user?.id,
    title: req.body.title,
    description: req.body.description || '',
    evidenceType: req.body.evidenceType,
    status: req.body.status || 'active',
    priority,
    tags: parseTags(req.body.tags),
    content: req.body.content,
  });

  await createAuditLog({
    req,
    action: 'upload_evidence',
    message: `Evidence created: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
    metadata: {
      evidenceType: evidence.evidenceType,
      priority: evidence.priority,
    },
  });

  await refreshCasePriority(evidence.caseId);

  return sendResponse(res, 201, evidence);
});

const uploadEvidence = asyncHandler(async (req, res) => {
  requireFields(req.body, ['caseId', 'title']);
  assertObjectId(req.body.caseId, 'caseId');

  if (!req.file) {
    throw AppError.badRequest('File is required');
  }

  const foundCase = await Case.findById(req.body.caseId);

  if (!foundCase) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // ignore cleanup error
    }

    throw AppError.notFound('Case not found');
  }

  try {
    await assertCaseAccess(req.user, req.body.caseId);
  } catch (error) {
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // ignore cleanup error
    }

    throw error;
  }

  const sha256 = await calculateSha256(req.file.path);
  const detectedEvidenceType = getEvidenceTypeFromFile(req.file);
  const requestedEvidenceType = req.body.evidenceType || detectedEvidenceType;

  assertEnum(requestedEvidenceType, FILE_EVIDENCE_TYPES, 'evidenceType');

  const filePayload = {
    originalName: req.file.originalname,
    storedName: req.file.filename,
    relativePath: getRelativeStoragePath(req.file.path),
    mimeType: req.file.mimetype,
    size: req.file.size,
    sha256,
  };

  const priority = inferEvidencePriority({
    evidenceType: requestedEvidenceType,
    content: req.body.content || '',
    file: filePayload,
  });

  const evidence = await Evidence.create({
    caseId: req.body.caseId,
    uploadedBy: req.user?._id || req.user?.id,
    title: req.body.title,
    description: req.body.description || '',
    evidenceType: requestedEvidenceType,
    status: 'active',
    priority,
    tags: parseTags(req.body.tags),
    content: req.body.content || '',
    file: filePayload,
  });

  await createAuditLog({
    req,
    action: 'upload_evidence',
    message: `File evidence uploaded: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
    metadata: {
      evidenceType: evidence.evidenceType,
      detectedEvidenceType,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sha256,
    },
  });

  await refreshCasePriority(evidence.caseId);

  return sendResponse(res, 201, evidence);
});

const getEvidence = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildEvidenceFilter(req.query);

  if (!req.query.status) {
    filter.status = { $ne: 'deleted' };
  }

  const scopedFilter = mergeFilters(filter, await evidenceAccessFilter(req.user));

  const [items, total] = await Promise.all([
    Evidence.find(scopedFilter)
      .populate('caseId', 'title status priority')
      .populate('uploadedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Evidence.countDocuments(scopedFilter),
  ]);

  return sendResponse(res, 200, items, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const getEvidenceStats = asyncHandler(async (req, res) => {
  const accessFilter = await evidenceAccessFilter(req.user);

  const [
    totalEvidence,
    activeEvidence,
    archivedEvidence,
    deletedEvidence,
    evidenceByType,
    evidenceByPriority,
  ] = await Promise.all([
    Evidence.countDocuments(accessFilter),
    Evidence.countDocuments(mergeFilters(accessFilter, { status: 'active' })),
    Evidence.countDocuments(mergeFilters(accessFilter, { status: 'archived' })),
    Evidence.countDocuments(mergeFilters(accessFilter, { status: 'deleted' })),
    Evidence.aggregate([
      { $match: accessFilter },
      { $group: { _id: '$evidenceType', count: { $sum: 1 } } }, {$project: { _id: 0, type: '$_id', count: 1 } }, {$sort: { type: 1 } },
    ]),
    Evidence.aggregate([
      { $match: accessFilter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }, {$project: { _id: 0, priority: '$_id', count: 1 } }, {$sort: { priority: 1 } },
    ]),
  ]);

  return sendResponse(res, 200, {
    totalEvidence,
    activeEvidence,
    archivedEvidence,
    deletedEvidence,
    evidenceByType,
    evidenceByPriority,
  });
});

const getArchivedEvidence = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const scopedFilter = mergeFilters({ status: 'archived' }, await evidenceAccessFilter(req.user));

  const [items, total] = await Promise.all([
    Evidence.find(scopedFilter)
      .populate('caseId', 'title status priority')
      .populate('uploadedBy', 'fullName email role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Evidence.countDocuments(scopedFilter),
  ]);

  return sendResponse(res, 200, items, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

const getEvidenceById = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');

  const evidence = await Evidence.findById(req.params.id)
    .populate('caseId', 'title status priority')
    .populate('uploadedBy', 'fullName email role')
    .populate('notes.createdBy', 'fullName email role');

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  return sendResponse(res, 200, evidence);
});

const updateEvidence = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');

  const evidence = await Evidence.findById(req.params.id).select('+previousVersions');

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  evidence.previousVersions.push({
    changedBy: req.user?._id || req.user?.id || null,
    snapshot: evidence.createSnapshot(),
  });

  if (req.body.title !== undefined) {
    evidence.title = req.body.title;
  }

  if (req.body.description !== undefined) {
    evidence.description = req.body.description;
  }

  if (req.body.status !== undefined) {
    assertEnum(req.body.status, EVIDENCE_STATUSES, 'status');
    evidence.status = req.body.status;
  }

  if (req.body.tags !== undefined) {
    evidence.tags = parseTags(req.body.tags);
  }

  if (req.body.content !== undefined) {
    if (hasStoredFile(evidence)) {
      evidence.content = req.body.content || '';
    } else {
      evidence.content = req.body.content;
    }
  }

  evidence.priority = inferEvidencePriority(evidence);

  await evidence.save();
  await refreshCasePriority(evidence.caseId);

  await createAuditLog({
    req,
    action: 'update_evidence',
    message: `Evidence updated: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
    metadata: {
      updatedFields: Object.keys(req.body),
    },
  });

  return sendResponse(res, 200, evidence);
});

const archiveEvidence = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');

  const evidence = await Evidence.findById(req.params.id).select('+previousVersions');

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  evidence.previousVersions.push({
    changedBy: req.user?._id || req.user?.id || null,
    snapshot: evidence.createSnapshot(),
  });

  evidence.status = 'archived';
  await evidence.save();
  await refreshCasePriority(evidence.caseId);

  await createAuditLog({
    req,
    action: 'archive_evidence',
    message: `Evidence archived: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
  });

  return sendResponse(res, 200, evidence);
});

const restoreEvidence = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');

  const evidence = await Evidence.findById(req.params.id).select('+previousVersions');

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  evidence.previousVersions.push({
    changedBy: req.user?._id || req.user?.id || null,
    snapshot: evidence.createSnapshot(),
  });

  evidence.status = 'active';
  await evidence.save();
  await refreshCasePriority(evidence.caseId);

  await createAuditLog({
    req,
    action: 'restore_evidence',
    message: `Evidence restored: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
  });

  return sendResponse(res, 200, evidence);
});

const addEvidenceNote = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');
  requireFields(req.body, ['text']);

  const evidence = await Evidence.findById(req.params.id);

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  evidence.notes.push({
    text: req.body.text,
    createdBy: req.user?._id || req.user?.id,
  });

  await evidence.save();

  await createAuditLog({
    req,
    action: 'add_note',
    message: `Note added to evidence: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
  });

  return sendResponse(res, 201, evidence.notes[evidence.notes.length - 1]);
});

const downloadEvidence = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');

  const evidence = await Evidence.findById(req.params.id);

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  if (!hasStoredFile(evidence)) {
    throw AppError.badRequest('This evidence has no downloadable file');
  }

  const absolutePath = resolveRelativeStoragePath(evidence.file.relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw AppError.notFound('Stored file not found');
  }

  // تحقق جنائي إضافي: إعادة احتساب الهاش والتأكد من مطابقة الملف الفعلي للسلامة الرقمية
  const currentSha256 = await calculateSha256(absolutePath);
  if (currentSha256 !== evidence.file.sha256) {
    await createAuditLog({
      req,
      action: 'integrity_violation_detected',
      message: `Integrity violation detected during download for evidence: ${evidence.title}`,
      caseId: evidence.caseId,
      evidenceId: evidence._id,
      metadata: { storedSha256: evidence.file.sha256, currentSha256 },
    });
    throw AppError.badRequest('Forensic integrity violation: File hash mismatch detected on disk!');
  }

  await createAuditLog({
    req,
    action: 'download_evidence',
    message: `Evidence downloaded: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
  });

  return res.download(absolutePath, getFileResponseName(evidence, absolutePath));
});

const previewEvidence = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');

  const evidence = await Evidence.findById(req.params.id);

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  if (!hasStoredFile(evidence)) {
    throw AppError.badRequest('This evidence has no preview file');
  }

  const absolutePath = resolveRelativeStoragePath(evidence.file.relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw AppError.notFound('Stored file not found');
  }

  await createAuditLog({
    req,
    action: 'preview_evidence',
    message: `Evidence previewed: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
  });

  res.setHeader('Content-Type', evidence.file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${getFileResponseName(evidence, absolutePath)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');

  return fs.createReadStream(absolutePath).pipe(res);
});

const verifyIntegrity = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'evidence id');

  const evidence = await Evidence.findById(req.params.id);

  if (!evidence || evidence.status === 'deleted') {
    throw AppError.notFound('Evidence not found');
  }

  await assertEvidenceAccess(req.user, evidence);

  if (!hasStoredFile(evidence) || !evidence.file?.sha256) {
    throw AppError.badRequest('This evidence has no file hash to verify');
  }

  const absolutePath = resolveRelativeStoragePath(evidence.file.relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw AppError.notFound('Stored file not found');
  }

  const currentSha256 = await calculateSha256(absolutePath);
  const matches = currentSha256 === evidence.file.sha256;

  await createAuditLog({
    req,
    action: 'verify_integrity',
    message: `Integrity verified for evidence: ${evidence.title}`,
    caseId: evidence.caseId,
    evidenceId: evidence._id,
    metadata: {
      storedSha256: evidence.file.sha256,
      currentSha256,
      matches,
    },
  });

  return sendResponse(res, 200, {
    evidenceId: evidence._id,
    evidenceType: evidence.evidenceType,
    storedSha256: evidence.file.sha256,
    currentSha256,
    matches,
  });
});

module.exports = {
  createEvidence,
  uploadEvidence,
  getEvidence,
  getEvidenceStats,
  getArchivedEvidence,
  getEvidenceById,
  updateEvidence,
  archiveEvidence,
  restoreEvidence,
  addEvidenceNote,
  downloadEvidence,
  previewEvidence,
  verifyIntegrity,
};
