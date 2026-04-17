const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  villaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Villa', required: true },
  guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  numberOfGuests: { type: Number, required: true },
  totalNights: { type: Number, required: true },
  subtotal: { type: Number, required: true }, // nights * nightly price
  cleaningFee: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'deposit_paid', 'fully_paid', 'refunded'],
    default: 'unpaid'
  },
  paymentIntentId: { type: String },
  
  guestDetails: {
    fullName: String,
    email: String,
    phone: String,
    specialRequests: String
  },
  
  createdAt: { type: Date, default: Date.now },
  cancelledAt: Date,
  cancellationReason: String
});

module.exports = mongoose.model('Booking', bookingSchema);