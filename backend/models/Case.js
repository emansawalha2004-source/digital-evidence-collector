const mongoose = require('mongoose');

const CASE_STATUSES = ['open', 'in_review', 'closed', 'archived'];
const CASE_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Case title is required'],
      trim: true,
      minlength: [2, 'Case title must be at least 2 characters'],
      maxlength: [180, 'Case title cannot exceed 180 characters'],
      index: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Case description cannot exceed 5000 characters'],
      default: '',
    },

    status: {
      type: String,
      enum: {
        values: CASE_STATUSES,
        message: 'Invalid case status',
      },
      default: 'open',
      index: true,
    },

    priority: {
      type: String,
      enum: {
        values: CASE_PRIORITIES,
        message: 'Invalid case priority',
      },
      default: 'medium',
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Case owner is required'],
      index: true,
    },

    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    tags: {
      type: [String],
      default: [],
      set: (tags) =>
        Array.isArray(tags)
          ? [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))]
          : [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

caseSchema.index({ title: 'text', description: 'text', tags: 'text' });
caseSchema.index({ status: 1, priority: 1 });
caseSchema.index({ owner: 1, status: 1 });
caseSchema.index({ assignedUsers: 1 });

module.exports = mongoose.model('Case', caseSchema);
module.exports.CASE_STATUSES = CASE_STATUSES;
module.exports.CASE_PRIORITIES = CASE_PRIORITIES;