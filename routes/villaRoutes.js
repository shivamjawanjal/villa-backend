const express = require('express');
const router = express.Router();
const { 
  getVilla, 
  updateVilla, 
  checkAvailability, 
  getPrices, 
  setPriceOverride, 
  deletePriceOverride 
} = require('../controllers/villaController');
const { protect, isOwner } = require('../middleware/auth');

// Public routes
router.get('/', getVilla);
router.post('/availability', checkAvailability);
router.get('/prices', getPrices);

// Owner only routes
router.put('/', protect, isOwner, updateVilla);
router.post('/prices', protect, isOwner, setPriceOverride);
router.delete('/prices/:date', protect, isOwner, deletePriceOverride);

module.exports = router;