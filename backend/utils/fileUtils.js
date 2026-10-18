const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getProjectRoot() {
  return path.resolve(__dirname, '..', '..');
}

function resolveStoragePath(envValue, fallbackRelativePath) {
  const projectRoot = getProjectRoot();
  const configuredPath = envValue || fallbackRelativePath;

  if (path.isAbsolute(configuredPath)) {
    return path.normalize(configuredPath);
  }

  return path.resolve(projectRoot, configuredPath);
}

function getUploadsDir() {
  return resolveStoragePath(process.env.STORAGE_UPLOADS_DIR, 'storage/uploads');
}

function getReportsDir() {
  return resolveStoragePath(process.env.STORAGE_REPORTS_DIR, 'storage/reports');
}

function ensureDirectoryExists(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function sanitizeOriginalName(originalName = '') {
  return path
    .basename(originalName)
    .replace(/[^\w.\-()\u0600-\u06FF ]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 180);
}

function getSafeUniqueFileName(originalName = '') {
  const safeName = sanitizeOriginalName(originalName);
  const extension = path.extname(safeName).toLowerCase();
  const baseName = path.basename(safeName, extension).slice(0, 80) || 'file';
  const uniquePart = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;

  return `${uniquePart}-${baseName}${extension}`;
}

function safeJoin(baseDir, relativePath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, relativePath);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new Error('Path traversal attempt blocked');
  }

  return resolvedTarget;
}

async function calculateSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function toPosixPath(value) {
  return String(value).split(path.sep).join('/');
}

function getRelativeStoragePath(absolutePath) {
  const projectRoot = getProjectRoot();
  return toPosixPath(path.relative(projectRoot, absolutePath));
}

function resolveRelativeStoragePath(relativePath) {
  const projectRoot = getProjectRoot();

  return safeJoin(projectRoot, relativePath);
}

module.exports = {
  getProjectRoot,
  getUploadsDir,
  getReportsDir,
  ensureDirectoryExists,
  sanitizeOriginalName,
  getSafeUniqueFileName,
  safeJoin,
  calculateSha256,
  getRelativeStoragePath,
  resolveRelativeStoragePath,
};