const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, verifyOTP, deleteProfile, requestDeleteOTP } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/request-delete', protect, requestDeleteOTP);
router.delete('/profile', protect, deleteProfile);

module.exports = router;