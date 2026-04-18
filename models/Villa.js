const mongoose = require('mongoose');

const villaSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'My Luxury Villa' },
  description: { type: String, required: true },
  address: {
    street: String,
    city: String,
    country: String,
    coordinates: { lat: Number, lng: Number } // optional for map
  },
  amenities: [String], // ["pool", "wifi", "parking", "ac"]
  maxGuests: { type: Number, required: true, default: 6 },
  bedrooms: Number,
  bathrooms: Number,
  checkInTime: { type: String, default: '15:00' },
  checkOutTime: { type: String, default: '11:00' },
  cancellationPolicy: {
    freeCancellationDays: { type: Number, default: 7 },
    refundPercentage: { type: Number, default: 50 }
  },
  images: [String],
  basePricePerNight: { type: Number, required: true },
  cleaningFee: { type: Number, default: 50 },
  minStayDays: { type: Number, default: 1 },
  maxStayDays: { type: Number, default: 30 },
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      fullName: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Villa', villaSchema);