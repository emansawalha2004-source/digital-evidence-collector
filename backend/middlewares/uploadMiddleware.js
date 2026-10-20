const path = require('path');
const multer = require('multer');

const AppError = require('../utils/AppError');
const {
  getUploadsDir,
  ensureDirectoryExists,
  getSafeUniqueFileName,
} = require('../utils/fileUtils');

const ALLOWED_EXTENSIONS = new Set([
  // images
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',

  // video
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.m4v',

  // audio
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
  '.flac',
  '.wma',

  // documents / text
  '.pdf',
  '.txt',
  '.doc',
  '.docx',
  '.csv',
  '.json',
  '.xlsx',
  '.xls',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar',
  '.7z',
]);

const ALLOWED_MIME_TYPES = new Set([
  // images
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',

  // video
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
  'video/x-m4v',

  // audio
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
  'audio/flac',
  'audio/x-ms-wma',

  // documents / text
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  // ملاحظة: تم حذف application/octet-stream لمنع رفع ملفات تنفيذية غير آمنة
]);

const MIME_TYPE_TO_EVIDENCE_TYPE = [
  { prefix: 'image/', type: 'image' },
  { prefix: 'video/', type: 'video' },
  { prefix: 'audio/', type: 'audio' },
];

const DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.txt',
  '.doc',
  '.docx',
  '.csv',
  '.json',
  '.xlsx',
  '.xls',
  '.ppt',
  '.pptx',
]);

const ARCHIVE_EXTENSIONS = new Set(['.zip', '.rar', '.7z']);

const maxFileSizeMb = Number.parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 100;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

const uploadsDir = getUploadsDir();
ensureDirectoryExists(uploadsDir);

function getEvidenceTypeFromFile(file) {
  const mimeType = String(file?.mimetype || '').toLowerCase();
  const extension = path.extname(file?.originalname || '').toLowerCase();

  const matchedMime = MIME_TYPE_TO_EVIDENCE_TYPE.find((item) =>
    mimeType.startsWith(item.prefix)
  );

  if (matchedMime) return matchedMime.type;
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document';
  if (ARCHIVE_EXTENSIONS.has(extension)) return 'file';

  return 'other';
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },

  filename(req, file, cb) {
    cb(null, getSafeUniqueFileName(file.originalname));
  },
});

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const mimeType = String(file.mimetype || '').toLowerCase();

  // 1. التحقق من امتداد الملف
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return cb(
      AppError.unsupportedMediaType('File extension is not allowed', {
        extension,
        allowedExtensions: Array.from(ALLOWED_EXTENSIONS).sort(),
      })
    );
  }

  // 2. التحقق من نوع الـ MIME القادم ومنع octet-stream
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return cb(
      AppError.unsupportedMediaType('File type is not allowed or too generic', {
        mimeType,
        allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES).sort(),
      })
    );
  }

  return cb(null, true);
}

const uploadEvidenceFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
  },
}).single('file');

function handleMulterError(err, req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        AppError.payloadTooLarge(`File is too large. Maximum allowed size is ${maxFileSizeMb}MB`)
      );
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(AppError.badRequest('Only one evidence file is allowed per request'));
    }

    return next(AppError.badRequest(err.message));
  }

  return next(err);
}

module.exports = {
  uploadEvidenceFile,
  handleMulterError,
  getEvidenceTypeFromFile,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
};
