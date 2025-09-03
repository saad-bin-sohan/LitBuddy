// backend/routes/otpRoutes.js

const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp } = require('../controllers/otpController');

// @route   POST /api/otp/send
// @desc    Send OTP via email or phone
// @access  Public
router.post('/send', sendOtp);

// @route   POST /api/otp/verify
// @desc    Verify OTP submitted by user
// @access  Public
router.post('/verify', verifyOtp);

module.exports = router;
