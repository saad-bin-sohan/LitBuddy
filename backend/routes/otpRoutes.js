// backend/routes/otpRoutes.js

const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp } = require('../controllers/otpController');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

// @route   POST /api/otp/send
// @desc    Send OTP via email or phone
// @access  Public
router.post('/send', otpSendLimiter, sendOtp);

// @route   POST /api/otp/verify
// @desc    Verify OTP submitted by user
// @access  Public
router.post('/verify', otpVerifyLimiter, verifyOtp);

module.exports = router;
