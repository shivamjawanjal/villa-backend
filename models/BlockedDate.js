const mongoose = require('mongoose');

const blockedDateSchema = new mongoose.Schema({
  villaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Villa', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, enum: ['maintenance', 'owner_use', 'private_event'], default: 'owner_use' },
  notes: String
});

blockedDateSchema.index({ villaId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('BlockedDate', blockedDateSchema);