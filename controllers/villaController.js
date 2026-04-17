const Villa = require('../models/Villa');
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

module.exports = { 
  getVilla, 
  updateVilla, 
  checkAvailability, 
  getPrices, 
  setPriceOverride, 
  deletePriceOverride 
};