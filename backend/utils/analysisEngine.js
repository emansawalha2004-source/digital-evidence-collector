const path = require('path');

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
      ? 'Escalate for manual investigation before using or sharing this evidence.'
      : level === 'medium'
        ? 'Review indicators and verify the source before taking action.'
        : 'No major risk indicators were detected. Keep normal chain-of-custody controls.';

  return {
    riskScore: finalScore,
    riskLevel: level,
    indicators,
    summary: indicators.length ? `${indicators.length} risk indicator(s) detected.` : cleanSummary,
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
      indicators.push({ key: 'suspicious_keyword', message: `Suspicious keyword detected: ${keyword}`, severity: 'medium' });
    }
  });

  if (/(\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b)/.test(text)) {
    score += 20;
    indicators.push({ key: 'possible_card_number', message: 'Possible payment card number pattern detected.', severity: 'high' });
  }

  if (text.length > 5000) {
    score += 8;
    indicators.push({ key: 'long_text', message: 'Very long text may require manual review.', severity: 'low' });
  }

  return finalize(score, indicators, 'Text appears low risk based on the current static checks.');
}

function analyzeLink(input) {
  const raw = String(input || '').trim();
  const indicators = [];
  let score = 0;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return finalize(70, [{ key: 'invalid_url', message: 'Input is not a valid URL.', severity: 'high' }], 'Invalid URL.');
  }

  if (parsed.protocol !== 'https:') {
    score += 20;
    indicators.push({ key: 'not_https', message: 'URL does not use HTTPS.', severity: 'medium' });
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
    score += 25;
    indicators.push({ key: 'ip_host', message: 'URL uses an IP address instead of a domain.', severity: 'high' });
  }

  if (raw.length > 120) {
    score += 10;
    indicators.push({ key: 'long_url', message: 'URL is unusually long.', severity: 'low' });
  }

  if (/%[0-9a-f]{2}/i.test(raw)) {
    score += 10;
    indicators.push({ key: 'encoded_chars', message: 'URL contains encoded characters.', severity: 'medium' });
  }

  const labels = parsed.hostname.split('.');
  const tld = labels[labels.length - 1]?.toLowerCase();
  if (riskyTlds.includes(tld)) {
    score += 20;
    indicators.push({ key: 'risky_tld', message: `Risky TLD detected: .${tld}`, severity: 'high' });
  }

  if (/(login|verify|secure|account|update|bank|wallet|free|bonus)/i.test(parsed.hostname + parsed.pathname)) {
    score += 12;
    indicators.push({ key: 'phishing_terms', message: 'URL contains common phishing terms.', severity: 'medium' });
  }

  if (parsed.hostname.split('.').length > 4) {
    score += 8;
    indicators.push({ key: 'deep_subdomain', message: 'URL contains multiple subdomain levels.', severity: 'low' });
  }

  return finalize(score, indicators, 'Link appears low risk based on the current static checks.');
}

function analyzeFileMetadata(file = {}) {
  const indicators = [];
  let score = 0;
  const name = file.originalName || file.storedName || file.filename || '';
  const ext = path.extname(name).toLowerCase();

  if (riskyExtensions.includes(ext)) {
    score += 35;
    indicators.push({ key: 'risky_extension', message: `Risky file extension detected: ${ext}`, severity: 'high' });
  }

  if (!file.sha256) {
    score += 20;
    indicators.push({ key: 'missing_hash', message: 'File hash is missing.', severity: 'high' });
  }

  if (!file.mimeType) {
    score += 8;
    indicators.push({ key: 'missing_mime', message: 'MIME type is missing.', severity: 'low' });
  }

  if (Number(file.size || 0) > 50 * 1024 * 1024) {
    score += 10;
    indicators.push({ key: 'large_file', message: 'File is larger than 50MB.', severity: 'medium' });
  }

  return finalize(score, indicators, 'File metadata appears low risk based on the current static checks.');
}

function analyzeEvidence(evidence) {
  if (evidence.evidenceType === 'text') return { analysisType: 'text', ...analyzeText(evidence.content) };
  if (evidence.evidenceType === 'link') return { analysisType: 'link', ...analyzeLink(evidence.content) };
  return { analysisType: 'file', ...analyzeFileMetadata(evidence.file || {}) };
}

module.exports = { analyzeText, analyzeLink, analyzeFileMetadata, analyzeEvidence };
