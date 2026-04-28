// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  loginWithOtp,
  getUserProfile,
  issueWsToken,
  logoutUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { otpVerifyLimiter } = require('../middleware/rateLimiter');

// Public
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/login-otp', otpVerifyLimiter, loginWithOtp);
router.post('/logout', logoutUser);

// Private
router.get('/profile', protect, getUserProfile);
router.get('/ws-token', protect, issueWsToken);

module.exports = router;
