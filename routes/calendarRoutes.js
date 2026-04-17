const express = require('express');
const router = express.Router();
const {
  getBookedDates,
  blockDates,
  unblockDates,
  getBlockedDates
} = require('../controllers/calendarController');
const { protect, isOwner } = require('../middleware/auth');

// Public route - get booked/blocked dates for calendar
router.get('/booked-dates', getBookedDates);

// Owner only routes
router.get('/blocked-dates', protect, isOwner, getBlockedDates);
router.post('/block-dates', protect, isOwner, blockDates);
router.delete('/block-dates/:id', protect, isOwner, unblockDates);

module.exports = router;
