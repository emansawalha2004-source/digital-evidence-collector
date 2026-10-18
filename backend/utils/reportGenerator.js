const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { getReportsDir, ensureDirectoryExists } = require('./fileUtils');

const PAGE = { margin: 50, width: 595.28, height: 841.89, bottom: 72 };
const COLORS = {
  blue: '#0f3f82',
  text: '#1f2933',
  muted: '#6b7280',
  rule: '#9ca3af',
  border: '#b8c2cc',
  headerFill: '#eef4fb',
};

function reportsDir() { return getReportsDir(); }
function pad(n) { return String(n).padStart(2, '0'); }
function reportId() { return `DEC-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`; }
function safePart(value) { return String(value || 'report').replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'report'; }
function makeReportFilename(prefix, id) { return `${safePart(prefix)}-${reportId()}-${safePart(id).slice(0, 12)}.pdf`.toLowerCase(); }
function str(value, fallback = 'N/A') { if (value === undefined || value === null || value === '') return fallback; return String(value); }
function cap(value) { const s = str(value, 'N/A').toLowerCase(); return s === 'n/a' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1); }
function userLabel(user) { if (!user) return 'Unknown'; return user.fullName || user.email || String(user); }
function fmtDate(value = new Date()) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-US', { hour12: true });
}
function fmtTimelineDate(value = new Date()) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return 'N/A';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function bytes(size) {
  const n = Number(size || 0);
  if (!n) return '0 bytes';
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let value = n;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}
function chunkHash(hash) { return str(hash).replace(/(.{64})/g, '$1\n').trim(); }
function shortHash(hash) { const value = str(hash, ''); return value.length > 24 ? `${value.slice(0, 16)}...${value.slice(-12)}` : value || 'N/A'; }
function latestAnalysis(analysis = []) { return Array.isArray(analysis) && analysis.length ? analysis[0] : null; }
function getEvidenceHash(evidence) { return evidence?.file?.sha256 || evidence?.sha256 || ''; }
function getEvidenceFile(evidence) { return evidence?.file || evidence?.files?.[0] || {}; }
function getEvidenceType(evidence) { return evidence?.evidenceType || evidence?.type || 'file'; }
function getAnalysisForEvidence(analysis, evidenceId) {
  return (analysis || []).find((item) => String(item.evidenceId?._id || item.evidenceId || '') === String(evidenceId || '')) || null;
}

function ensureSpace(doc, height = 90) {
  if (doc.y + height > PAGE.height - PAGE.bottom) doc.addPage();
}

function drawTitleBox(doc, title) {
  const x = PAGE.margin;
  const y = 44;
  const w = PAGE.width - PAGE.margin * 2;
  doc.save();
  doc.rect(x, y, w, 62).fillAndStroke(COLORS.headerFill, COLORS.blue);
  doc.fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(20).text(title, x, y + 22, { width: w, align: 'center', characterSpacing: 1.8 });
  doc.restore();
  doc.y = y + 128;
}

function section(doc, number, title) {
  ensureSpace(doc, 52);
  doc.moveDown(number === 1 ? 0 : 0.55);
  doc.fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(14).text(`${number}. ${title}`, PAGE.margin, doc.y, { underline: true });
  doc.moveDown(0.55);
}

function rule(doc) {
  const y = doc.y + 5;
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.rule).lineWidth(0.8).stroke();
  doc.y = y + 12;
}

function paragraph(doc, text) {
  ensureSpace(doc, 56);
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(11).text(str(text), PAGE.margin, doc.y, {
    width: PAGE.width - PAGE.margin * 2,
    align: 'justify',
    lineGap: 3,
  });
  doc.moveDown(0.75);
}

function lineValue(doc, label, value, options = {}) {
  ensureSpace(doc, 24);
  const x = PAGE.margin;
  const y = doc.y;
  const labelWidth = options.labelWidth || 150;
  const width = PAGE.width - PAGE.margin * 2;
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11).text(`${label}:`, x, y, { width: labelWidth, continued: false });
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(11).text(str(value), x + labelWidth, y, { width: width - labelWidth });
  doc.y = Math.max(doc.y, y + 16);
}

function listLines(doc, rows) {
  rows.filter(Boolean).forEach(([label, value]) => lineValue(doc, label, value));
}

function hashBox(doc, hash) {
  ensureSpace(doc, 62);
  const x = PAGE.margin;
  const w = PAGE.width - PAGE.margin * 2;
  const y = doc.y;
  const value = chunkHash(hash) || 'N/A';
  const h = Math.max(52, doc.heightOfString(value, { width: w - 22, lineGap: 2 }) + 22);
  doc.rect(x, y, w, h).strokeColor(COLORS.border).lineWidth(0.8).stroke();
  doc.fillColor(COLORS.text).font('Courier').fontSize(9).text(value, x + 12, y + 14, { width: w - 24, lineGap: 2 });
  doc.y = y + h + 12;
}

function refTitle(ref, fallback = 'N/A') {
  if (!ref) return fallback;
  if (typeof ref === 'object') return ref.title || ref.fullName || ref.email || ref._id || fallback;
  return String(ref);
}

function timelineRows(auditLogs = []) {
  if (!auditLogs.length) {
    return [{ label: 'No timeline events available', time: 'N/A', action: 'N/A', actor: 'N/A', caseTitle: 'N/A', evidenceTitle: 'N/A' }];
  }

  return auditLogs
    .slice()
    .reverse()
    .map((item) => ({
      label: item.message || item.action || 'Timeline Event',
      action: item.action || 'event',
      actor: userLabel(item.actorId),
      caseTitle: refTitle(item.caseId),
      evidenceTitle: refTitle(item.evidenceId),
      time: fmtTimelineDate(item.createdAt),
    }));
}

function renderTimeline(doc, events) {
  events.forEach((item, index) => {
    const mainLine = `${index + 1}. ${str(item.time)} | ${cap(item.action)} | ${str(item.label)}`;
    const metaLine = `Actor: ${str(item.actor)} | Case: ${str(item.caseTitle)} | Evidence: ${str(item.evidenceTitle)}`;
    ensureSpace(doc, 42);
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10.5).text(mainLine, PAGE.margin, doc.y, {
      width: PAGE.width - PAGE.margin * 2,
      lineGap: 2,
    });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9.5).text(metaLine, PAGE.margin + 14, doc.y, {
      width: PAGE.width - PAGE.margin * 2 - 14,
      lineGap: 2,
    });
    doc.moveDown(0.35);
  });
  doc.moveDown(0.5);
}

function analysisIndicators(analysis) {
  return (analysis?.indicators || []).map((item) => item.message || item.key).filter(Boolean).join(', ') || 'No indicators detected';
}

function preliminaryAssessment({ caseData, evidenceData, analysis }) {
  const a = latestAnalysis(analysis);
  const level = cap(a?.riskLevel || evidenceData?.priority || caseData?.priority || 'unknown');
  const article = ['High', 'Critical'].includes(level) ? 'a high level of suspicious indicators' : `a ${level.toLowerCase()} level of suspicious indicators`;
  return `Based on the automated preliminary inspection of the submitted digital evidence, the case presents ${article}. These findings should not be treated as a final legal or forensic determination, but rather as an initial support report for further examination by authorized specialists.`;
}

function addFooter(doc, reportKind = 'Preliminary Forensic Report') {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const pageNo = i + 1 - range.start;
    doc.save();
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(`Digital Evidence Collector | ${reportKind} | Page ${pageNo}`, PAGE.margin, PAGE.height - 82, {
      width: PAGE.width - PAGE.margin * 2,
      align: 'center',
    });
    doc.moveTo(PAGE.margin, PAGE.height - 36).lineTo(PAGE.width - PAGE.margin, PAGE.height - 36).strokeColor(COLORS.rule).lineWidth(0.7).stroke();
    doc.restore();
  }
}

function table(doc, columns, rows) {
  const x = PAGE.margin;
  const totalWidth = PAGE.width - PAGE.margin * 2;
  const headerHeight = 22;
  ensureSpace(doc, headerHeight + 32);
  let y = doc.y;
  doc.rect(x, y, totalWidth, headerHeight).fill(COLORS.headerFill).strokeColor(COLORS.border).stroke();
  let cx = x;
  columns.forEach((col) => {
    doc.fillColor(COLORS.blue).font('Helvetica-Bold').fontSize(8.5).text(col.label, cx + 4, y + 7, { width: col.width - 8 });
    cx += col.width;
  });
  y += headerHeight;
  doc.y = y;

  rows.forEach((row) => {
    ensureSpace(doc, 36);
    y = doc.y;
    const rowHeight = 34;
    doc.rect(x, y, totalWidth, rowHeight).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    cx = x;
    columns.forEach((col) => {
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8).text(str(row[col.key]), cx + 4, y + 6, { width: col.width - 8, height: rowHeight - 10, ellipsis: true });
      cx += col.width;
    });
    doc.y = y + rowHeight;
  });
  doc.moveDown(0.7);
}

function renderEvidenceReportContent(doc, { meta, generatedBy, caseData, evidenceData, auditLogs, analysis }) {
  const a = latestAnalysis(analysis);
  const evidenceType = getEvidenceType(evidenceData);
  const file = getEvidenceFile(evidenceData);
  const hash = getEvidenceHash(evidenceData);
  const incidentTitle = evidenceData?.title || caseData?.title || 'Digital Evidence Submission';
  const incidentDescription = evidenceData?.description || caseData?.description || 'Submitted evidence for preliminary review.';

  drawTitleBox(doc, 'DIGITAL EVIDENCE REPORT');

  section(doc, 1, 'Report Identification');
  listLines(doc, [
    ['Report ID', meta.reportId],
    ['Generated On', fmtDate()],
    ['Generated By', userLabel(generatedBy)],
    ['System Name', 'Digital Evidence Collector'],
    ['Report Type', 'Preliminary Digital Evidence Analysis Report'],
    ['Intended Recipient', 'Authorized Cybercrime Investigation Authority'],
  ]);
  rule(doc);

  section(doc, 2, 'Executive Summary');
  paragraph(doc, a?.summary || 'The submitted evidence has been inspected by the automated preliminary analysis engine. The output requires authorized specialist review before any formal conclusion.');
  lineValue(doc, 'Initial Suspicion Level', cap(a?.riskLevel || evidenceData?.priority || 'unknown'));
  rule(doc);

  section(doc, 3, 'Incident Information');
  listLines(doc, [
    ['Incident Title', incidentTitle],
    ['Description', incidentDescription],
    ['Case Status', caseData?.status || 'N/A'],
    ['Evidence Type', evidenceType],
  ]);
  rule(doc);

  section(doc, 4, evidenceType === 'link' ? 'Link Inspection Findings' : evidenceType === 'text' ? 'Text Inspection Findings' : 'Content Inspection Findings');
  if (evidenceType === 'link') {
    const url = evidenceData?.content || evidenceData?.url || '';
    listLines(doc, [
      ['Submitted URL', url],
      ['Phishing Score', a?.riskScore ?? 0],
      ['Indicators', analysisIndicators(a)],
      ['Assessment', a?.summary || 'No automated link analysis was available'],
      ['Recommendation', a?.recommendation || 'Forward to qualified cybercrime personnel for formal review'],
    ]);
  } else if (evidenceType === 'text') {
    listLines(doc, [
      ['Detected Keywords', analysisIndicators(a)],
      ['Risk Score', a?.riskScore ?? 0],
      ['Assessment', a?.summary || 'No automated text analysis was available'],
      ['Recommendation', a?.recommendation || 'Forward to qualified cybercrime personnel for formal review'],
    ]);
  } else {
    listLines(doc, [
      ['Evidence Type', evidenceType],
      ['Risk Score', a?.riskScore ?? 0],
      ['Indicators', analysisIndicators(a)],
      ['Assessment', a?.summary || 'File metadata inspection completed'],
      ['Recommendation', a?.recommendation || 'Forward to qualified digital forensic personnel for formal review'],
    ]);
  }
  rule(doc);

  section(doc, 5, 'File Metadata');
  listLines(doc, [
    ['File Name', file.originalName || file.filename || file.storedName || evidenceData?.title],
    ['File Size', file.size !== undefined ? bytes(file.size) : 'N/A'],
    ['MIME Type', file.mimeType || 'N/A'],
    ['Stored Name', file.storedName || 'N/A'],
    ['Created At', fmtDate(evidenceData?.createdAt)],
    ['Modified At', fmtDate(evidenceData?.updatedAt || evidenceData?.createdAt)],
  ]);
  rule(doc);

  section(doc, 6, 'Evidence Integrity Verification');
  paragraph(doc, 'The following SHA-256 hash value was generated to preserve evidence integrity and support later verification that the file has not been altered.');
  hashBox(doc, hash || 'N/A');
  rule(doc);

  section(doc, 7, 'Chronological Timeline');
  renderTimeline(doc, timelineRows(auditLogs));
  rule(doc);

  section(doc, 8, 'Preliminary Assessment');
  paragraph(doc, preliminaryAssessment({ caseData, evidenceData, analysis }));
  lineValue(doc, 'Recommended Action', a?.recommendation || 'Forward to qualified digital forensic or cybercrime personnel for formal review');
  rule(doc);

  section(doc, 9, 'Notice');
  paragraph(doc, 'This document was generated automatically by the Digital Evidence Collector system for preliminary evidence organization and inspection purposes. It does not constitute a judicial ruling, conclusive forensic opinion, or formal legal accusation.');
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text('Authorized System Output');
  doc.font('Helvetica').fontSize(11).text('Digital Evidence Collector');
  doc.text(`Generated on: ${fmtDate()}`);
}

function renderCaseReportContent(doc, { meta, generatedBy, caseData, evidenceItems, auditLogs, analysis }) {
  const riskCounts = analysis.reduce((acc, item) => { acc[item.riskLevel] = (acc[item.riskLevel] || 0) + 1; return acc; }, {});
  const highest = analysis.some((a) => a.riskLevel === 'critical') ? 'Critical' : analysis.some((a) => a.riskLevel === 'high') ? 'High' : analysis.some((a) => a.riskLevel === 'medium') ? 'Medium' : 'Low';

  drawTitleBox(doc, 'DIGITAL EVIDENCE REPORT');

  section(doc, 1, 'Report Identification');
  listLines(doc, [
    ['Report ID', meta.reportId],
    ['Generated On', fmtDate()],
    ['Generated By', userLabel(generatedBy)],
    ['System Name', 'Digital Evidence Collector'],
    ['Report Type', 'Preliminary Digital Evidence Case Report'],
    ['Intended Recipient', 'Authorized Cybercrime Investigation Authority'],
  ]);
  rule(doc);

  section(doc, 2, 'Executive Summary');
  paragraph(doc, `This case report includes ${evidenceItems.length} evidence item(s), ${auditLogs.length} chronological event(s), and ${analysis.length} automated inspection result(s). Initial suspicion level: ${highest}.`);
  lineValue(doc, 'Initial Suspicion Level', highest);
  rule(doc);

  section(doc, 3, 'Incident Information');
  listLines(doc, [
    ['Incident Title', caseData?.title],
    ['Description', caseData?.description],
    ['Case Status', caseData?.status],
    ['Priority', caseData?.priority],
    ['Owner', userLabel(caseData?.owner)],
    ['Assigned Users', (caseData?.assignedUsers || []).map(userLabel).join(', ') || 'N/A'],
  ]);
  rule(doc);

  section(doc, 4, 'Evidence Summary');
  table(doc, [
    { label: 'Title', key: 'title', width: 126 },
    { label: 'Type', key: 'type', width: 54 },
    { label: 'Priority', key: 'priority', width: 58 },
    { label: 'Risk', key: 'risk', width: 58 },
    { label: 'Uploaded', key: 'uploaded', width: 110 },
    { label: 'SHA-256', key: 'hash', width: 89 },
  ], evidenceItems.map((item) => {
    const itemAnalysis = getAnalysisForEvidence(analysis, item._id);
    return {
      title: item.title,
      type: getEvidenceType(item),
      priority: item.priority,
      risk: cap(itemAnalysis?.riskLevel || 'N/A'),
      uploaded: fmtTimelineDate(item.createdAt),
      hash: shortHash(getEvidenceHash(item)),
    };
  }));
  rule(doc);

  section(doc, 5, 'Automated Analysis Findings');
  listLines(doc, [
    ['Low', riskCounts.low || 0],
    ['Medium', riskCounts.medium || 0],
    ['High', riskCounts.high || 0],
    ['Critical', riskCounts.critical || 0],
    ['Indicators', analysis.flatMap((item) => item.indicators || []).slice(0, 12).map((item) => item.message || item.key).join(', ') || 'No indicators detected'],
  ]);
  rule(doc);

  section(doc, 6, 'Evidence Integrity Verification');
  const withHash = evidenceItems.filter((item) => getEvidenceHash(item)).length;
  listLines(doc, [
    ['Evidence With SHA-256', withHash],
    ['Evidence Without Hash', evidenceItems.length - withHash],
    ['Integrity Assessment', withHash === evidenceItems.length ? 'All evidence records include a stored SHA-256 value.' : 'Some evidence records require manual hash verification.'],
  ]);
  rule(doc);

  section(doc, 7, 'Chronological Timeline');
  renderTimeline(doc, timelineRows(auditLogs));
  rule(doc);

  section(doc, 8, 'Preliminary Assessment');
  paragraph(doc, preliminaryAssessment({ caseData, analysis }));
  lineValue(doc, 'Recommended Action', 'Forward to qualified digital forensic or cybercrime personnel for formal review');
  rule(doc);

  section(doc, 9, 'Notice');
  paragraph(doc, 'This document was generated automatically by the Digital Evidence Collector system for preliminary evidence organization and inspection purposes. It does not constitute a judicial ruling, conclusive forensic opinion, or formal legal accusation.');
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text('Authorized System Output');
  doc.font('Helvetica').fontSize(11).text('Digital Evidence Collector');
  doc.text(`Generated on: ${fmtDate()}`);
}

async function generateEvidencePdfReport({ filename, reportId: forcedReportId = null, generatedBy, caseData, evidenceData, auditLogs = [], analysis = [] }) {
  ensureDirectoryExists(reportsDir());
  const absolutePath = path.join(reportsDir(), filename);
  const meta = { reportId: forcedReportId || reportId() };
  const doc = new PDFDocument({ margin: PAGE.margin, size: 'A4', bufferPages: true, autoFirstPage: true });
  const stream = fs.createWriteStream(absolutePath);
  doc.pipe(stream);
  renderEvidenceReportContent(doc, { meta, generatedBy, caseData, evidenceData, auditLogs, analysis });
  addFooter(doc, 'Preliminary Forensic Report');
  doc.end();
  return new Promise((resolve, reject) => { stream.on('finish', () => resolve({ absolutePath, reportId: meta.reportId })); stream.on('error', reject); });
}

async function generateCasePdfReport({ filename, reportId: forcedReportId = null, generatedBy, caseData, evidenceItems = [], auditLogs = [], analysis = [] }) {
  ensureDirectoryExists(reportsDir());
  const absolutePath = path.join(reportsDir(), filename);
  const meta = { reportId: forcedReportId || reportId() };
  const doc = new PDFDocument({ margin: PAGE.margin, size: 'A4', bufferPages: true, autoFirstPage: true });
  const stream = fs.createWriteStream(absolutePath);
  doc.pipe(stream);
  renderCaseReportContent(doc, { meta, generatedBy, caseData, evidenceItems, auditLogs, analysis });
  addFooter(doc, 'Preliminary Forensic Report');
  doc.end();
  return new Promise((resolve, reject) => { stream.on('finish', () => resolve({ absolutePath, reportId: meta.reportId })); stream.on('error', reject); });
}

module.exports = { reportsDir, makeReportFilename, generateEvidencePdfReport, generateCasePdfReport };
