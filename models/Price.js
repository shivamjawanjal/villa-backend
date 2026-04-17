const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  villaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Villa', required: true },
  date: { type: Date, required: true },
  pricePerNight: { type: Number, required: true },
  reason: { type: String, enum: ['seasonal', 'weekend', 'holiday', 'special'], default: 'special' }
});

// Compound index for efficient queries
priceSchema.index({ villaId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Price', priceSchema);