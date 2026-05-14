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
const User = require('../models/userModel');
const OTP = require('../models/otpModel');
const generateToken = require('../utils/generateToken');
const {
  AUTH_COOKIE_NAME,
  getSetCookieOptions,
  clearAuthCookies,
} = require('../config/authCookie');

const { sanitizeUserForResponse } = require('../utils/userSerializer');

// Helper: get client IP (behind proxies)
const getClientIp = (req) => {
  const xff = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  if (xff) return xff.split(',')[0].trim();
  return req.connection?.remoteAddress || req.ip;
};

function getWsTokenTtlSeconds() {
  const parsed = Number.parseInt(process.env.WS_TOKEN_TTL || '120', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 120;
  return parsed;
}



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
    // Explicitly set hasCompletedSetup to true since we have all required fields
    hasCompletedSetup: true,
  });

  if (user) {
    const token = generateToken(user._id);

    // Set token in httpOnly cookie
    res.cookie(AUTH_COOKIE_NAME, token, getSetCookieOptions());

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

  // Block Google OAuth users from password login
  if (user.isGoogleUser) {
    res.status(401);
    throw new Error(
      'This account uses Google Sign-In. Please use the "Sign in with Google" button.'
    );
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
  res.cookie(AUTH_COOKIE_NAME, token, getSetCookieOptions());

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

  // Add deviceId with sliding window — keep last 20 unique devices
  if (deviceId && !user.devices.includes(deviceId)) {
    user.devices.push(deviceId);
    if (user.devices.length > 20) {
      user.devices = user.devices.slice(-20);
    }
  }

  // Add login IP with sliding window — keep last 20 unique IPs
  if (ip && !user.loginIPs.includes(ip)) {
    user.loginIPs.push(ip);
    if (user.loginIPs.length > 20) {
      user.loginIPs = user.loginIPs.slice(-20);
    }
  }

  await user.save();

  // generate token
  const token = generateToken(user._id);

  // Set token in httpOnly cookie
  res.cookie(AUTH_COOKIE_NAME, token, getSetCookieOptions());

  res.json({
    user: sanitizeUserForResponse(user),
  });
});

// @desc Logout - clear cookie
// @route POST /api/auth/logout
// @access Public (client calls to clear cookie)
const logoutUser = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
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

// @desc Issue short-lived websocket token
// @route GET /api/auth/ws-token
// @access Private
const issueWsToken = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  const expiresInSeconds = getWsTokenTtlSeconds();
  const token = jwt.sign(
    {
      id: String(userId),
      scope: 'ws',
    },
    process.env.JWT_SECRET,
    {
      expiresIn: expiresInSeconds,
    }
  );

  res.set('Cache-Control', 'no-store');
  res.json({ token, expiresInSeconds });
});

module.exports = {
  registerUser,
  loginUser,
  loginWithOtp,
  getUserProfile,
  issueWsToken,
  logoutUser, // exported for route mounting
};
