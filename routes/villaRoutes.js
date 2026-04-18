const express = require('express');
const router = express.Router();
const { 
  getVilla, 
  updateVilla, 
  checkAvailability, 
  getPrices, 
  setPriceOverride, 
  deletePriceOverride,
  createReview,
  getAnalytics
} = require('../controllers/villaController');
const { protect, isOwner } = require('../middleware/auth');

// Public routes
router.get('/', getVilla);
router.post('/availability', checkAvailability);
router.get('/prices', getPrices);

// Guest routes (Authenticated)
router.post('/:id/reviews', protect, createReview);

// Owner only routes
router.get('/analytics', protect, isOwner, getAnalytics);
router.put('/', protect, isOwner, updateVilla);
router.post('/prices', protect, isOwner, setPriceOverride);
router.delete('/prices/:date', protect, isOwner, deletePriceOverride);

module.exports = router;