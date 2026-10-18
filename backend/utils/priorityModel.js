const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const { analyzeText, analyzeLink, analyzeFileMetadata, analyzeEvidence } = require('./analysisEngine');

const PRIORITY_ORDER = ['low', 'medium', 'high', 'critical'];

function normalizePriority(priority, fallback = 'low') {
  return PRIORITY_ORDER.includes(priority) ? priority : fallback;
}

function higherPriority(a, b) {
  const left = normalizePriority(a);
  const right = normalizePriority(b);
  return PRIORITY_ORDER.indexOf(right) > PRIORITY_ORDER.indexOf(left) ? right : left;
}

function inferCasePriority(input = {}) {
  const tags = Array.isArray(input.tags) ? input.tags.join(' ') : String(input.tags || '');
  const modelInput = [input.title, input.description, tags].filter(Boolean).join('\n');

  if (!modelInput.trim()) {
    return 'low';
  }

  return normalizePriority(analyzeText(modelInput).riskLevel, 'low');
}

function inferEvidencePriority(evidence = {}) {
  const evidenceType = evidence.evidenceType || evidence.type;

  if (evidenceType === 'text') {
    return normalizePriority(analyzeText(evidence.content || '').riskLevel, 'low');
  }

  if (evidenceType === 'link') {
    return normalizePriority(analyzeLink(evidence.content || evidence.url || '').riskLevel, 'low');
  }

  if (evidence.file) {
    return normalizePriority(analyzeFileMetadata(evidence.file).riskLevel, 'low');
  }

  return normalizePriority(analyzeEvidence(evidence).riskLevel, 'low');
}

async function refreshCasePriority(caseId) {
  if (!caseId) return null;

  const caseDoc = await Case.findById(caseId);
  if (!caseDoc) return null;

  let priority = inferCasePriority({
    title: caseDoc.title,
    description: caseDoc.description,
    tags: caseDoc.tags,
  });

  const evidenceItems = await Evidence.find({
    caseId,
    status: { $ne: 'deleted' },
  }).select('priority').lean();

  evidenceItems.forEach((item) => {
    priority = higherPriority(priority, item.priority);
  });

  if (caseDoc.priority !== priority) {
    caseDoc.priority = priority;
    await caseDoc.save();
  }

  return priority;
}

module.exports = {
  inferCasePriority,
  inferEvidencePriority,
  higherPriority,
  refreshCasePriority,
};
