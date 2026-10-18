const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  evidenceId: mongoose.Schema.Types.ObjectId,
  action: String,
  message: String,
  performedBy: String
}, { timestamps: true });

module.exports = mongoose.model('Timeline', timelineSchema);