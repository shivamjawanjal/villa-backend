const Booking = require('../models/Booking');
const Villa = require('../models/Villa');
const BlockedDate = require('../models/BlockedDate');
const Price = require('../models/Price');
const emailService = require('../utils/emailService');
const User = require('../models/User');

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private (authenticated users)
const createBooking = async (req, res) => {
  try {
    const { checkInDate, checkOutDate, numberOfGuests, guestDetails } = req.body;
    const villa = await Villa.findOne();

    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }

    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    // Validate dates
    if (startDate >= endDate) {
      return res.status(400).json({ message: 'Check-out date must be after check-in date' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return res.status(400).json({ message: 'Cannot book dates in the past' });
    }

    // Check number of guests
    if (numberOfGuests > villa.maxGuests) {
      return res.status(400).json({ message: `Maximum ${villa.maxGuests} guests allowed` });
    }

    // Calculate nights
    const totalNights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Check min/max stay
    if (totalNights < villa.minStayDays) {
      return res.status(400).json({ message: `Minimum stay is ${villa.minStayDays} night(s)` });
    }
    if (totalNights > villa.maxStayDays) {
      return res.status(400).json({ message: `Maximum stay is ${villa.maxStayDays} nights` });
    }

    // Check for conflicts with existing bookings
    const conflictingBookings = await Booking.find({
      villaId: villa._id,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkInDate: { $lt: endDate }, checkOutDate: { $gt: startDate } }
      ]
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ message: 'Selected dates are not available' });
    }

    // Check for blocked dates
    const blockedDates = await BlockedDate.find({
      villaId: villa._id,
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
      ]
    });

    if (blockedDates.length > 0) {
      return res.status(400).json({ message: 'Selected dates are blocked by the owner' });
    }

    // Calculate price for each night (checking for overrides)
    let subtotal = 0;
    for (let i = 0; i < totalNights; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const priceOverride = await Price.findOne({
        villaId: villa._id,
        date: { $gte: dayStart, $lt: dayEnd }
      });

      const nightlyPrice = priceOverride ? priceOverride.pricePerNight : villa.basePricePerNight;
      subtotal += nightlyPrice;
    }

    const totalPrice = subtotal + villa.cleaningFee;

    // Create booking
    const booking = await Booking.create({
      villaId: villa._id,
      guestId: req.user.id,
      checkInDate: startDate,
      checkOutDate: endDate,
      numberOfGuests,
      totalNights,
      subtotal,
      cleaningFee: villa.cleaningFee,
      totalPrice,
      status: 'pending',
      paymentStatus: 'unpaid',
      guestDetails: guestDetails || {
        fullName: req.user.fullName || '',
        email: req.user.email || '',
        phone: '',
        specialRequests: ''
      }
    });

    res.status(201).json(booking);

    // Send email notification to owner (asynchronous)
    try {
      await emailService.sendOwnerBookingNotification(booking, req.user, villa);
    } catch (emailError) {
      console.error('Failed to send owner notification email:', emailError);
    }
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all bookings (owner sees all, guest sees theirs)
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'owner') {
      bookings = await Booking.find()
        .populate('guestId', 'fullName email phone')
        .sort({ createdAt: -1 });
    } else {
      bookings = await Booking.find({ guestId: req.user.id })
        .sort({ createdAt: -1 });
    }
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('guestId', 'fullName email phone');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only owner or the guest who made the booking can view it
    if (req.user.role !== 'owner' && booking.guestId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only owner or the guest who made the booking can cancel
    if (req.user.role !== 'owner' && booking.guestId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed booking' });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'No reason provided';

    await booking.save();
    res.json(booking);

    // Send cancellation email to guest (asynchronous)
    try {
      const villa = await Villa.findById(booking.villaId);
      const guest = await User.findById(booking.guestId);
      const refundAmount = booking.paymentStatus === 'fully_paid' ? booking.totalPrice : 0;
      await emailService.sendCancellationEmail(booking, guest, villa, refundAmount);
    } catch (emailError) {
      console.error('Failed to send cancellation email:', emailError);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confirm a booking (owner only)
// @route   PUT /api/bookings/:id/confirm
// @access  Private (owner)
const confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bookings can be confirmed' });
    }

    booking.status = 'confirmed';
    await booking.save();
    res.json(booking);

    // Send confirmation email to guest (asynchronous)
    try {
      const villa = await Villa.findById(booking.villaId);
      const guest = await User.findById(booking.guestId);
      await emailService.sendBookingConfirmation(booking, guest, villa);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get booking statistics for owner dashboard
// @route   GET /api/bookings/owner/stats
// @access  Private (owner)
const getBookingStats = async (req, res) => {
  try {
    const allBookings = await Booking.find({ status: { $ne: 'cancelled' } });

    const totalBookings = allBookings.length;
    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Calculate occupancy: total booked nights in the last 90 days
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const recentBookings = allBookings.filter(b => {
      return b.checkInDate >= ninetyDaysAgo && b.status !== 'cancelled';
    });

    const totalBookedNights = recentBookings.reduce((sum, b) => sum + (b.totalNights || 0), 0);
    const occupancyRate = Math.round((totalBookedNights / 90) * 100);

    // Pending bookings count
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });

    // Confirmed bookings count
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });

    res.json({
      totalBookings,
      totalRevenue,
      occupancyRate: Math.min(occupancyRate, 100),
      pendingBookings,
      confirmedBookings,
      recentBookingsCount: recentBookings.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  confirmBooking,
  getBookingStats
};
