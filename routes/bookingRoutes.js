const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  confirmBooking,
  getBookingStats
} = require('../controllers/bookingController');
const { protect, isOwner } = require('../middleware/auth');

// Owner stats route (must be before /:id to avoid conflict)
router.get('/owner/stats', protect, isOwner, getBookingStats);

// Booking CRUD
router.post('/', protect, createBooking);
router.get('/', protect, getBookings);
router.get('/:id', protect, getBookingById);
router.put('/:id/cancel', protect, cancelBooking);
router.put('/:id/confirm', protect, isOwner, confirmBooking);

module.exports = router;
