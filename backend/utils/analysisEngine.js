const path = require('path');

// قواعد ونصوص استدلالية أولية (Heuristic Rules - Preliminary Indicators)
// ملاحظة أكاديمية: هذه القواعد تمثل مؤشرات فحص أولية فقط وليست جزماً قاطعاً بوجود خصائص خبيثة أو تحليل جنائي عميق، وقد تحتمل إنذارات خاطئة (False Positives).

const suspiciousKeywords = [
  'password', 'credential', 'otp', 'wire transfer', 'urgent', 'crypto', 'wallet', 'seed phrase',
  'verify account', 'click here', 'bank', 'invoice overdue', 'gift card', 'remote access', 'malware',
];

const riskyTlds = ['zip', 'mov', 'tk', 'ml', 'ga', 'cf', 'gq', 'top', 'xyz', 'ru'];
const riskyExtensions = ['.exe', '.bat', '.cmd', '.scr', '.ps1', '.vbs', '.js', '.jar', '.msi', '.apk'];

function clamp(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskLevel(score) {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function finalize(score, indicators, cleanSummary) {
  const finalScore = clamp(score);
  const level = riskLevel(finalScore);
  const recommendation =
    level === 'critical' || level === 'high'
      ? 'Heuristic alert: Escalation for manual forensic investigation is recommended before relying on this evidence.'
      : level === 'medium'
        ? 'Preliminary review recommended: Verify source and indicators to rule out false positives.'
        : 'No major heuristic risk indicators were detected. Maintain standard chain-of-custody controls.';

  return {
    riskScore: finalScore,
    riskLevel: level,
    indicators,
    summary: indicators.length 
      ? `${indicators.length} preliminary heuristic indicator(s) detected (Note: May include false positives; requires manual verification).` 
      : cleanSummary,
    recommendation,
  };
}

function analyzeText(input) {
  const text = String(input || '');
  const lowered = text.toLowerCase();
  const indicators = [];
  let score = 0;

  suspiciousKeywords.forEach((keyword) => {
    if (lowered.includes(keyword)) {
      score += 10;
      indicators.push({ key: 'suspicious_keyword', message: `Preliminary keyword match: ${keyword}`, severity: 'medium' });
    }
  });

  if (/(\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b)/.test(text)) {
    score += 20;
    indicators.push({ key: 'possible_card_number', message: 'Potential payment card pattern detected heuristically.', severity: 'high' });
  }

  if (text.length > 5000) {
    score += 8;
    indicators.push({ key: 'long_text', message: 'Extended text volume requires manual analyst review.', severity: 'low' });
  }

  return finalize(score, indicators, 'Text appears low-risk based on preliminary heuristic checks.');
}

function analyzeLink(input) {
  const raw = String(input || '').trim();
  const indicators = [];
  let score = 0;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return finalize(70, [{ key: 'invalid_url', message: 'Input format is not a valid URL structure.', severity: 'high' }], 'Invalid URL format.');
  }

  if (parsed.protocol !== 'https:') {
    score += 20;
    indicators.push({ key: 'not_https', message: 'URL protocol lacks secure HTTPS enforcement.', severity: 'medium' });
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
    score += 25;
    indicators.push({ key: 'ip_host', message: 'URL utilizes a direct IP host instead of a registered domain.', severity: 'high' });
  }

  if (raw.length > 120) {
    score += 10;
    indicators.push({ key: 'long_url', message: 'URL string length exceeds standard heuristic thresholds.', severity: 'low' });
  }

  if (/%[0-9a-f]{2}/i.test(raw)) {
    score += 10;
    indicators.push({ key: 'encoded_chars', message: 'URL contains encoded characters requiring scrutiny.', severity: 'medium' });
  }

  const labels = parsed.hostname.split('.');
  const tld = labels[labels.length - 1]?.toLowerCase();
  if (riskyTlds.includes(tld)) {
    score += 20;
    indicators.push({ key: 'risky_tld', message: `Statistically risky TLD detected: .${tld}`, severity: 'high' });
  }

  if (/(login|verify|secure|account|update|bank|wallet|free|bonus)/i.test(parsed.hostname + parsed.pathname)) {
    score += 12;
    indicators.push({ key: 'phishing_terms', message: 'URL contains common heuristic phishing indicators/terms.', severity: 'medium' });
  }

  if (parsed.hostname.split('.').length > 4) {
    score += 8;
    indicators.push({ key: 'deep_subdomain', message: 'URL contains multiple deep subdomain levels.', severity: 'low' });
  }

  return finalize(score, indicators, 'Link appears low-risk based on preliminary heuristic checks.');
}

function analyzeFileMetadata(file = {}) {
  const indicators = [];
  let score = 0;
  const name = file.originalName || file.storedName || file.filename || '';
  const ext = path.extname(name).toLowerCase();

  if (riskyExtensions.includes(ext)) {
    score += 35;
    indicators.push({ key: 'risky_extension', message: `Potentially executable or risky file extension: ${ext}`, severity: 'high' });
  }

  if (!file.sha256) {
    score += 20;
    indicators.push({ key: 'missing_hash', message: 'Cryptographic integrity hash (SHA-256) is missing.', severity: 'high' });
  }

  if (!file.mimeType) {
    score += 8;
    indicators.push({ key: 'missing_mime', message: 'File MIME type metadata is missing.', severity: 'low' });
  }

  if (Number(file.size || 0) > 50 * 1024 * 1024) {
    score += 10;
    indicators.push({ key: 'large_file', message: 'File size exceeds standard 50MB analysis threshold.', severity: 'medium' });
  }

  return finalize(score, indicators, 'File metadata appears low-risk based on preliminary heuristic checks.');
}

function analyzeEvidence(evidence) {
  if (evidence.evidenceType === 'text') return { analysisType: 'text', ...analyzeText(evidence.content) };
  if (evidence.evidenceType === 'link') return { analysisType: 'link', ...analyzeLink(evidence.content) };
  return { analysisType: 'file', ...analyzeFileMetadata(evidence.file || {}) };
}

module.exports = { analyzeText, analyzeLink, analyzeFileMetadata, analyzeEvidence };
