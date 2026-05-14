// backend/controllers/googleAuthController.js

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const { AUTH_COOKIE_NAME, getSetCookieOptions } = require('../config/authCookie');

const { sanitizeUserForResponse } = require('../utils/userSerializer');



// @desc Handle Google OAuth callback
// @route GET /api/auth/google/callback
// @access Public
const handleGoogleCallback = asyncHandler(async (req, res) => {
  const { googleId, email, name, picture } = req.body;

  if (!googleId || !email) {
    res.status(400);
    throw new Error('Google ID and email are required');
  }

  // Check if user already exists with this Google ID
  let user = await User.findOne({ googleId });

  if (!user) {
    // Check if user exists with this email (but not Google user)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400);
      throw new Error('An account with this email already exists. Please login with your password.');
    }

    // Create new Google user
    user = await User.create({
      googleId,
      googleEmail: email,
      googleProfilePicture: picture,
      email,
      name: name || 'Google User',
      isGoogleUser: true,
      isVerified: true, // Google users are verified by default
      // age and gender intentionally omitted — user completes them in ProfileSetup
      role: 'reader',
      isAdmin: false,
      hasCompletedSetup: false, // Google users need to complete profile setup
    });
  }

  // If suspended and not an admin, block login
  if (user.suspendedUntil && user.suspendedUntil > new Date() && !user.hasRole?.('admin')) {
    res.status(403);
    throw new Error(`Account suspended until ${user.suspendedUntil.toISOString()}`);
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);

  // Set token in httpOnly cookie
  res.cookie(AUTH_COOKIE_NAME, token, getSetCookieOptions());

  res.json({
    user: sanitizeUserForResponse(user),
  });
});

// @desc Check if user exists with Google ID
// @route POST /api/auth/google/check
// @access Public
const checkGoogleUser = asyncHandler(async (req, res) => {
  const { googleId } = req.body;

  if (!googleId) {
    res.status(400);
    throw new Error('Google ID is required');
  }

  const user = await User.findOne({ googleId });
  
  if (user) {
    res.json({ exists: true, user: sanitizeUserForResponse(user) });
  } else {
    res.json({ exists: false });
  }
});

module.exports = {
  handleGoogleCallback,
  checkGoogleUser,
};
