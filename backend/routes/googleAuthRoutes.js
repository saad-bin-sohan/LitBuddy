// backend/routes/googleAuthRoutes.js

const express = require('express');
const router = express.Router();
const { handleGoogleCallback, checkGoogleUser } = require('../controllers/googleAuthController');

// @route POST /api/auth/google/callback
// @desc Handle Google OAuth callback
// @access Public
router.post('/callback', handleGoogleCallback);

// @route POST /api/auth/google/check
// @desc Check if user exists with Google ID
// @access Public
router.post('/check', checkGoogleUser);

module.exports = router;
