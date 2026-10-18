const mongoose = require('mongoose');

const EVIDENCE_TYPES = [
  'file',
  'text',
  'link',
  'image',
  'video',
  'audio',
  'document',
  'other',
];

const FILE_EVIDENCE_TYPES = [
  'file',
  'image',
  'video',
  'audio',
  'document',
  'other',
];

const CONTENT_EVIDENCE_TYPES = ['text', 'link'];

const EVIDENCE_STATUSES = ['active', 'archived', 'deleted'];
const EVIDENCE_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const evidenceFileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      trim: true,
      default: '',
    },

    storedName: {
      type: String,
      trim: true,
      default: '',
    },

    relativePath: {
      type: String,
      trim: true,
      default: '',
    },

    mimeType: {
      type: String,
      trim: true,
      default: '',
    },

    size: {
      type: Number,
      min: 0,
      default: 0,
    },

    sha256: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^[a-f0-9]{64}$|^$/, 'Invalid SHA-256 hash'],
    },
  },
  { _id: false }
);

const evidenceNoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      minlength: [1, 'Note text cannot be empty'],
      maxlength: [3000, 'Note text cannot exceed 3000 characters'],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Note creator is required'],
    },

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { _id: true }
);

const evidenceVersionSchema = new mongoose.Schema(
  {
    changedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: true }
);

const evidenceSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: [true, 'Case ID is required'],
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
      index: true,
    },

    title: {
      type: String,
      required: [true, 'Evidence title is required'],
      trim: true,
      minlength: [2, 'Evidence title must be at least 2 characters'],
      maxlength: [180, 'Evidence title cannot exceed 180 characters'],
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Evidence description cannot exceed 5000 characters'],
      default: '',
    },

    evidenceType: {
      type: String,
      enum: {
        values: EVIDENCE_TYPES,
        message: 'Invalid evidence type',
      },
      required: [true, 'Evidence type is required'],
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: EVIDENCE_STATUSES,
        message: 'Invalid evidence status',
      },
      default: 'active',
      index: true,
    },

    priority: {
      type: String,
      enum: {
        values: EVIDENCE_PRIORITIES,
        message: 'Invalid evidence priority',
      },
      default: 'medium',
      index: true,
    },

    tags: {
      type: [String],
      default: [],
      set: (tags) =>
        Array.isArray(tags)
          ? [
              ...new Set(
                tags
                  .map((tag) => String(tag).trim().toLowerCase())
                  .filter(Boolean)
              ),
            ]
          : [],
    },

    content: {
      type: String,
      trim: true,
      maxlength: [20000, 'Evidence content cannot exceed 20000 characters'],
      default: '',
    },

    file: {
      type: evidenceFileSchema,
      default: () => ({}),
    },

    notes: {
      type: [evidenceNoteSchema],
      default: [],
    },

    previousVersions: {
      type: [evidenceVersionSchema],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

evidenceSchema.index({
  title: 'text',
  description: 'text',
  content: 'text',
  tags: 'text',
  'file.originalName': 'text',
});

evidenceSchema.index({ caseId: 1, status: 1 });
evidenceSchema.index({ evidenceType: 1, priority: 1 });
evidenceSchema.index({ uploadedBy: 1, createdAt: -1 });
evidenceSchema.index({ 'file.sha256': 1 });

evidenceSchema.pre('validate', function validateEvidenceContent() {
  if (FILE_EVIDENCE_TYPES.includes(this.evidenceType)) {
    if (
      !this.file ||
      !this.file.relativePath ||
      !this.file.storedName ||
      !this.file.sha256 ||
      !this.file.mimeType
    ) {
      this.invalidate(
        'file',
        'File metadata is required for file/image/video/audio/document evidence'
      );
    }
  }

  if (CONTENT_EVIDENCE_TYPES.includes(this.evidenceType)) {
    if (!this.content || !String(this.content).trim()) {
      this.invalidate('content', 'Content is required for text/link evidence');
    }
  }

  if (this.evidenceType === 'link') {
    try {
      const url = new URL(String(this.content).trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        this.invalidate('content', 'Only http/https links are allowed');
      }
    } catch {
      this.invalidate('content', 'Valid evidence link is required');
    }
  }
});

evidenceSchema.methods.createSnapshot = function createSnapshot() {
  return {
    caseId: this.caseId,
    uploadedBy: this.uploadedBy,
    title: this.title,
    description: this.description,
    evidenceType: this.evidenceType,
    status: this.status,
    priority: this.priority,
    tags: this.tags,
    content: this.content,
    file: this.file,
    notes: this.notes,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Evidence', evidenceSchema);
module.exports.EVIDENCE_TYPES = EVIDENCE_TYPES;
module.exports.FILE_EVIDENCE_TYPES = FILE_EVIDENCE_TYPES;
module.exports.CONTENT_EVIDENCE_TYPES = CONTENT_EVIDENCE_TYPES;
module.exports.EVIDENCE_STATUSES = EVIDENCE_STATUSES;
module.exports.EVIDENCE_PRIORITIES = EVIDENCE_PRIORITIES;