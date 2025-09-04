// backend/controllers/googleAuthController.js

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// Cookie options (used for setting and clearing cookie)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'None',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function sanitizeUserForResponse(user) {
  if (!user) return null;
  const u = (typeof user.toObject === 'function') ? user.toObject() : { ...user };
  return {
    _id: u._id,
    name: u.name,
    displayName: u.displayName,
    email: u.email,
    phone: u.phone,
    age: u.age,
    gender: u.gender,
    bio: u.bio,
    favoriteBooks: u.favoriteBooks,
    favoriteSongs: u.favoriteSongs,
    quote: u.quote,
    preferences: u.preferences,
    isVerified: !!u.isVerified,
    isAdmin: !!u.isAdmin,
    role: u.role || (u.isAdmin ? 'admin' : 'reader'),
    plan: u.plan,
    maxActiveConversations: u.maxActiveConversations,
    activeConversations: u.activeConversations,
    hasCompletedSetup: !!u.hasCompletedSetup,
    suspendedUntil: u.suspendedUntil || null,
    googleId: u.googleId,
    googleEmail: u.googleEmail,
    googleProfilePicture: u.googleProfilePicture,
    isGoogleUser: !!u.isGoogleUser,
  };
}

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
      // Set default values for required fields
      age: 18, // Default age, will be updated in profile setup
      gender: 'Other', // Default gender, will be updated in profile setup
      password: 'google-oauth-user', // Placeholder password for Google users
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
  res.cookie('token', token, cookieOptions);

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
