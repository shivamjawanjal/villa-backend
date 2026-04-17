const Booking = require('../models/Booking');
const BlockedDate = require('../models/BlockedDate');
const Villa = require('../models/Villa');

// @desc    Get all booked and blocked dates for calendar display
// @route   GET /api/calendar/booked-dates
// @access  Public
const getBookedDates = async (req, res) => {
  try {
    const villa = await Villa.findOne();
    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }

    // Get confirmed and pending bookings
    const bookings = await Booking.find({
      villaId: villa._id,
      status: { $in: ['confirmed', 'pending'] }
    }).select('checkInDate checkOutDate status');

    // Get blocked dates
    const blockedDates = await BlockedDate.find({
      villaId: villa._id
    }).select('startDate endDate reason');

    // Format for FullCalendar events
    const events = [];

    bookings.forEach(booking => {
      events.push({
        id: `booking-${booking._id}`,
        title: booking.status === 'confirmed' ? 'Booked' : 'Pending',
        start: booking.checkInDate,
        end: booking.checkOutDate,
        color: booking.status === 'confirmed' ? '#e74c3c' : '#f39c12',
        type: 'booking',
        status: booking.status
      });
    });

    blockedDates.forEach(blocked => {
      events.push({
        id: `blocked-${blocked._id}`,
        title: `Blocked: ${blocked.reason}`,
        start: blocked.startDate,
        end: blocked.endDate,
        color: '#95a5a6',
        type: 'blocked',
        reason: blocked.reason
      });
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Block dates (owner only)
// @route   POST /api/calendar/block-dates
// @access  Private (owner)
const blockDates = async (req, res) => {
  try {
    const { startDate, endDate, reason, notes } = req.body;
    const villa = await Villa.findOne();

    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Check for conflicting bookings
    const conflictingBookings = await Booking.find({
      villaId: villa._id,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkInDate: { $lt: end }, checkOutDate: { $gt: start } }
      ]
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ message: 'Cannot block dates that have existing bookings' });
    }

    const blockedDate = await BlockedDate.create({
      villaId: villa._id,
      startDate: start,
      endDate: end,
      reason: reason || 'owner_use',
      notes: notes || ''
    });

    res.status(201).json(blockedDate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unblock dates (owner only)
// @route   DELETE /api/calendar/block-dates/:id
// @access  Private (owner)
const unblockDates = async (req, res) => {
  try {
    const blockedDate = await BlockedDate.findByIdAndDelete(req.params.id);

    if (!blockedDate) {
      return res.status(404).json({ message: 'Blocked date entry not found' });
    }

    res.json({ message: 'Dates unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all blocked dates
// @route   GET /api/calendar/blocked-dates
// @access  Private (owner)
const getBlockedDates = async (req, res) => {
  try {
    const villa = await Villa.findOne();
    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }

    const blockedDates = await BlockedDate.find({ villaId: villa._id })
      .sort({ startDate: 1 });

    res.json(blockedDates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getBookedDates,
  blockDates,
  unblockDates,
  getBlockedDates
};
