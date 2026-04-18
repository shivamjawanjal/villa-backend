const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../utils/emailService');

// Generate JWT
const generateToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Register new user (guest)
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // Simple validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Create user (unverified)
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      phone,
      role: 'guest',
      isVerified: false,
      otp,
      otpExpires
    });
    
    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, otp);
      console.log(`OTP for ${email}: ${otp}`); // Log for development/testing
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // We still created the user, they can retry verification later or we could handle this differently
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email for the verification code.',
      email: user.email
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and log in
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide email and OTP' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' });
    }

    // Mark as verified and clear OTP
    console.log(`Verifying OTP for ${email}. Code entered: ${otp}, Code in DB: ${user.otp}`);
    
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Return token
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.email, user.role)
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if verified (Only for guests)
    if (!user.isVerified && user.role !== 'owner') {
      // Generate NEW 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      // Send OTP email
      try {
        await emailService.sendOTPEmail(user.email, otp);
        console.log(`New Login OTP for ${user.email}: ${otp}`);
      } catch (emailError) {
        console.error('Failed to resend OTP email during login:', emailError);
      }

      return res.status(401).json({ 
        message: 'Email not verified. A new verification code has been sent to your email.',
        notVerified: true,
        email: user.email 
      });
    }
    
    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id, user.email, user.role)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.phone = req.body.phone || user.phone;
      
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }
      
      const updatedUser = await user.save();
      
      res.json({
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        token: generateToken(updatedUser._id, updatedUser.email, updatedUser.role)
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request OTP for account deletion
// @route   POST /api/auth/request-delete
const requestDeleteOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    try {
      await emailService.sendOTPEmail(user.email, otp);
      console.log(`Delete Account OTP for ${user.email}: ${otp}`);
    } catch (emailError) {
      console.error('Failed to send delete OTP email:', emailError);
    }

    res.json({ message: 'A verification code has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user profile
// @route   DELETE /api/auth/profile
const deleteProfile = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'Please provide the verification code' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getProfile, updateProfile, verifyOTP, deleteProfile, requestDeleteOTP };