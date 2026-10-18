const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema(
  {
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence', default: null, index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', default: null, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    analysisType: { type: String, enum: ['text', 'link', 'file', 'evidence'], required: true, index: true },
    riskScore: { type: Number, min: 0, max: 100, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true, index: true },
    indicators: [
      {
        key: { type: String, required: true },
        message: { type: String, required: true },
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
      },
    ],
    summary: { type: String, default: '' },
    recommendation: { type: String, default: '' },
    rawInput: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

analysisResultSchema.index({ evidenceId: 1, createdAt: -1 });
analysisResultSchema.index({ requestedBy: 1, createdAt: -1 });

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
