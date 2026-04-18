const Villa = require('../models/Villa');
const User = require('../models/User');
const Price = require('../models/Price');
const Booking = require('../models/Booking');
const BlockedDate = require('../models/BlockedDate');

// @desc    Get villa details
// @route   GET /api/villa
const getVilla = async (req, res) => {
  try {
    const villa = await Villa.findOne(); // Single villa for MVP
    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }
    res.json(villa);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update villa details (Owner only)
// @route   PUT /api/villa
const updateVilla = async (req, res) => {
  try {
    let villa = await Villa.findOne();
    
    if (!villa) {
      villa = new Villa(req.body);
    } else {
      Object.assign(villa, req.body);
    }
    
    const updatedVilla = await villa.save();
    res.json(updatedVilla);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get availability for date range
// @route   POST /api/villa/availability
const checkAvailability = async (req, res) => {
  try {
    const { checkInDate, checkOutDate } = req.body;
    const villa = await Villa.findOne();
    
    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }
    
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    
    if (startDate >= endDate) {
      return res.json({ available: false, message: 'Check-out date must be after check-in date' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return res.json({ available: false, message: 'Cannot book dates in the past' });
    }

    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (nights < villa.minStayDays) {
      return res.json({ available: false, message: `Minimum stay is ${villa.minStayDays} night(s)` });
    }
    if (nights > villa.maxStayDays) {
      return res.json({ available: false, message: `Maximum stay is ${villa.maxStayDays} nights` });
    }
    
    // Check existing bookings
    const existingBookings = await Booking.find({
      villaId: villa._id,
      status: { $in: ['confirmed', 'pending'] },
      $or: [
        { checkInDate: { $lt: endDate }, checkOutDate: { $gt: startDate } }
      ]
    });
    
    // Check blocked dates
    const blockedDates = await BlockedDate.find({
      villaId: villa._id,
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
      ]
    });
    
    const isAvailable = existingBookings.length === 0 && blockedDates.length === 0;
    
    // Calculate total price if available
    let totalPrice = null;
    if (isAvailable) {
      let subtotal = 0;
      
      // Calculate price for each night (with overrides)
      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const priceOverride = await Price.findOne({
          villaId: villa._id,
          date: {
            $gte: new Date(currentDate.setHours(0,0,0,0)),
            $lt: new Date(currentDate.setHours(23,59,59,999))
          }
        });
        
        const nightlyPrice = priceOverride ? priceOverride.pricePerNight : villa.basePricePerNight;
        subtotal += nightlyPrice;
      }
      
      totalPrice = subtotal + villa.cleaningFee;
      
      res.json({
        available: true,
        nights,
        subtotal,
        cleaningFee: villa.cleaningFee,
        totalPrice
      });
    } else {
      res.json({ available: false, message: 'Dates not available' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all prices (for calendar)
// @route   GET /api/villa/prices
const getPrices = async (req, res) => {
  try {
    const villa = await Villa.findOne();
    const prices = await Price.find({ villaId: villa._id });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set price override (Owner only)
// @route   POST /api/villa/prices
const setPriceOverride = async (req, res) => {
  try {
    const { date, pricePerNight, reason } = req.body;
    const villa = await Villa.findOne();
    
    const price = await Price.findOneAndUpdate(
      { villaId: villa._id, date: new Date(date) },
      { pricePerNight, reason },
      { upsert: true, new: true }
    );
    
    res.json(price);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete price override
// @route   DELETE /api/villa/prices/:date
const deletePriceOverride = async (req, res) => {
  try {
    const villa = await Villa.findOne();
    await Price.findOneAndDelete({ 
      villaId: villa._id, 
      date: new Date(req.params.date) 
    });
    res.json({ message: 'Price override removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add review to villa
// @route   POST /api/villa/:id/reviews
const createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const villa = await Villa.findById(req.params.id);

    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }

    // Check if user has already reviewed
    const alreadyReviewed = villa.reviews.find(
      (r) => r.user.toString() === req.user.id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Villa already reviewed' });
    }

    // Check if user has a past/completed booking
    const hasBooking = await Booking.findOne({
      villaId: villa._id,
      guestId: req.user.id,
      status: 'confirmed',
      checkOutDate: { $lt: new Date() }
    });

    if (!hasBooking) {
      return res.status(400).json({ message: 'You can only review villas you have stayed at.' });
    }

    const user = await User.findById(req.user.id);

    const review = {
      user: req.user.id,
      fullName: user.fullName,
      rating: Number(rating),
      comment,
    };

    villa.reviews.push(review);
    villa.numReviews = villa.reviews.length;
    villa.averageRating =
      villa.reviews.reduce((acc, item) => item.rating + acc, 0) /
      villa.reviews.length;

    await villa.save();
    res.status(201).json({ message: 'Review added' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get owner analytics
// @route   GET /api/villa/analytics
const getAnalytics = async (req, res) => {
  try {
    const villa = await Villa.findOne();
    if (!villa) {
      return res.status(404).json({ message: 'Villa not found' });
    }

    const bookings = await Booking.find({ 
      villaId: villa._id,
      status: 'confirmed'
    });

    // Total Revenue
    const totalRevenue = bookings.reduce((acc, b) => acc + b.totalPrice, 0);
    
    // Total Nights
    const totalNights = bookings.reduce((acc, b) => {
      const start = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return acc + nights;
    }, 0);

    // Monthly breakdown (Last 6 months)
    const monthlyStats = {};
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    bookings.forEach(b => {
      const date = new Date(b.createdAt);
      if (date >= sixMonthsAgo) {
        const month = date.toLocaleString('default', { month: 'short' });
        monthlyStats[month] = (monthlyStats[month] || 0) + b.totalPrice;
      }
    });

    res.json({
      totalRevenue,
      totalBookings: bookings.length,
      totalNights,
      averageBookingValue: bookings.length > 0 ? (totalRevenue / bookings.length).toFixed(2) : 0,
      monthlyRevenue: Object.entries(monthlyStats).map(([month, revenue]) => ({ month, revenue })),
      recentReviews: villa.reviews.slice(-3).reverse() // Include a few recent reviews for context
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  getVilla, 
  updateVilla, 
  checkAvailability, 
  getPrices, 
  setPriceOverride, 
  deletePriceOverride,
  createReview,
  getAnalytics
};