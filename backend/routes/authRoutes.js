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

// Public
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/login-otp', loginWithOtp);
router.post('/logout', logoutUser);

// Private
router.get('/profile', protect, getUserProfile);
router.get('/ws-token', protect, issueWsToken);

module.exports = router;
