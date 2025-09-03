// backend/controllers/authController.js
/**
 * Updated authController with role-aware responses and suspension checks.
 * - Ensure registration cannot create an admin implicitly.
 * - Return role & isAdmin in login/register/profile responses (backwards compatibility).
 * - Block non-admin suspended users from finishing auth flows.
 *
 * Now: sets JWT in httpOnly cookie instead of returning token in JSON.
 */

const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const OTP = require('../models/otpModel');
const { sendOtpEmail, sendOtpSMS } = require('../utils/sendOtp');
const generateToken = require('../utils/generateToken');

// Helper: get client IP (behind proxies)
const getClientIp = (req) => {
  const xff = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  if (xff) return xff.split(',')[0].trim();
  return req.connection?.remoteAddress || req.ip;
};

const getAvailableMethods = (user) => {
  const methods = [];
  if (user.email) methods.push('email');
  if (user.phone) methods.push('phone');
  return methods;
};

function sanitizeUserForResponse(user) {
  // user is a mongoose document or plain object
  if (!user) return null;
  // ensure plain object
  const u = (typeof user.toObject === 'function') ? user.toObject() : { ...user };
  // Keep a stable set of response fields (add more as needed)
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
    isAdmin: !!u.isAdmin, // legacy flag
    role: u.role || (u.isAdmin ? 'admin' : 'reader'),
    plan: u.plan,
    maxActiveConversations: u.maxActiveConversations,
    activeConversations: u.activeConversations,
    hasCompletedSetup: !!u.hasCompletedSetup,
    suspendedUntil: u.suspendedUntil || null,
  };
}

// Cookie options (used for setting and clearing cookie)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'None',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// @desc Register new user
// @route POST /api/auth/register
// @access Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, age, gender, acceptedTerms } = req.body;

  // required fields
  if (!name || !password || !age || !gender || acceptedTerms !== true) {
    res.status(400);
    throw new Error('All required fields must be provided and Terms accepted.');
  }

  if (!email && !phone) {
    res.status(400);
    throw new Error('Please provide at least an email or phone number');
  }

  // Enforce password strength (simple rule: min 6 chars, at least one letter and one number)
  const isStrong = password.length >= 6 && /\d/.test(password) && /[A-Za-z]/.test(password);
  if (!isStrong) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long and contain both letters and numbers');
  }

  // Check duplicates by email or phone — only if provided
  const orConditions = [];
  if (email) orConditions.push({ email });
  if (phone) orConditions.push({ phone });

  if (orConditions.length > 0) {
    const existing = await User.findOne({ $or: orConditions });
    if (existing) {
      res.status(400);
      throw new Error('An account with this email or phone already exists');
    }
  }

  // Always create a normal 'reader' role via public registration.
  const user = await User.create({
    name,
    email,
    phone,
    password,
    age,
    gender,
    // Ensure new users are readers by default; do not allow role/isAdmin in public registration
    role: 'reader',
    isAdmin: false,
  });

  if (user) {
    const token = generateToken(user._id);

    // Set token in httpOnly cookie
    res.cookie('token', token, cookieOptions);

    res.status(201).json({
      user: sanitizeUserForResponse(user),
    });
  } else {
    res.status(400);
    throw new Error('Failed to create user');
  }
});

// @desc Login user & get token OR request OTP when suspicious
// @route POST /api/auth/login
// @access Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // If suspended and not an admin, block login
  if (user.suspendedUntil && user.suspendedUntil > new Date() && !user.hasRole?.('admin')) {
    res.status(403);
    throw new Error(`Account suspended until ${user.suspendedUntil.toISOString()}`);
  }

  // Password check
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    // Increment failed attempts
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedAt = new Date();
    await user.save();

    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Normal login success
  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);

  // Set token in httpOnly cookie
  res.cookie('token', token, cookieOptions);

  res.json({
    user: sanitizeUserForResponse(user),
  });
});

// @desc Login using OTP (bypass new-device/failed attempts flow after OTP verification)
// @route POST /api/auth/login-otp
// @access Public
const loginWithOtp = asyncHandler(async (req, res) => {
  const { email, method, code, deviceId } = req.body;
  const ip = getClientIp(req);

  if (!email || !method || !code) {
    res.status(400);
    throw new Error('email, method and code are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // If suspended and not an admin, block login
  if (user.suspendedUntil && user.suspendedUntil > new Date() && !user.hasRole?.('admin')) {
    res.status(403);
    throw new Error(`Account suspended until ${user.suspendedUntil.toISOString()}`);
  }

  const identifier = method === 'email' ? user.email : user.phone;
  if (!identifier) {
    res.status(400);
    throw new Error('Selected method is not available for this account');
  }

  // Find matching OTP
  const otpDoc = await OTP.findOne({ identifier, method, code });
  if (!otpDoc) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }
  if (otpDoc.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otpDoc._id });
    res.status(400);
    throw new Error('OTP expired');
  }

  // OTP ok → remove OTPs for identifier
  await OTP.deleteMany({ identifier });

  // mark user as verified and update devices/IPs
  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  if (deviceId && !user.devices.includes(deviceId)) user.devices.push(deviceId);
  if (ip && !user.loginIPs.includes(ip)) user.loginIPs.push(ip);
  await user.save();

  // generate token
  const token = generateToken(user._id);

  // Set token in httpOnly cookie
  res.cookie('token', token, cookieOptions);

  res.json({
    user: sanitizeUserForResponse(user),
  });
});

// @desc Logout - clear cookie
// @route POST /api/auth/logout
// @access Public (client calls to clear cookie)
const logoutUser = asyncHandler(async (req, res) => {
  // Clear cookie (match path/flags used for setting)
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None',
    path: '/',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

// @desc Get logged-in user's profile
// @route GET /api/auth/profile
// @access Private
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user?._id || (req.user && req.user.id);
  if (!userId) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  const user = await User.findById(userId);
  if (user) {
    res.json(sanitizeUserForResponse(user));
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  registerUser,
  loginUser,
  loginWithOtp,
  getUserProfile,
  logoutUser, // exported for route mounting
};