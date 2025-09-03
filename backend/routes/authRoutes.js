// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  loginWithOtp,
  getUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/login-otp', loginWithOtp);

// Private
router.get('/profile', protect, getUserProfile);

module.exports = router;
