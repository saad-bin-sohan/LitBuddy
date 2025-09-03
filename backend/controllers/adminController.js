// backend/controllers/adminController.js
/**
 * Admin controller - endpoints for platform administrators.
 *
 * Notes:
 * - This file intentionally keeps operations limited to fields already present
 *   in your existing User model (isAdmin, suspendedUntil, isVerified, reportCount).
 * - All handlers assume `protect` middleware has attached `req.user` (user doc without password).
 *
 * Exposed functions:
 *  - listUsers            GET  /api/admin/users
 *  - getUser              GET  /api/admin/users/:id
 *  - promoteToAdmin       PATCH /api/admin/users/:id/promote
 *  - demoteFromAdmin      PATCH /api/admin/users/:id/demote
 *  - suspendUser          PATCH /api/admin/users/:id/suspend
 *  - unsuspendUser        PATCH /api/admin/users/:id/unsuspend
 *  - resetReports         PATCH /api/admin/users/:id/reset-reports
 *  - verifyUser           PATCH /api/admin/users/:id/verify
 */

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Report = require('../models/reportModel');
const notificationService = require('../services/notificationService');

/**
 * List users (paginated)
 * Query params:
 *  - page (default 1)
 *  - limit (default 20, max 200)
 *  - search (search name/displayName/email/phone)
 *  - isAdmin (true/false)
 *  - suspended (true/false)  -> filters users with suspendedUntil > now
 */
const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limitRaw = parseInt(req.query.limit || '20', 10);
  const limit = Math.min(Math.max(1, limitRaw || 20), 200);
  const search = (req.query.search || '').trim();
  const { isAdmin, suspended } = req.query;

  const filter = {};

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: re },
      { displayName: re },
      { email: re },
      { phone: re },
    ];
  }

  if (typeof isAdmin !== 'undefined') {
    filter.isAdmin = String(isAdmin) === 'true';
  }

  if (typeof suspended !== 'undefined') {
    if (String(suspended) === 'true') {
      filter.suspendedUntil = { $gt: new Date() };
    } else {
      filter.$or = filter.$or || [];
      filter.$or.push({ suspendedUntil: null }, { suspendedUntil: { $lte: new Date() } });
    }
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json({
    users,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

/**
 * Get single user by id
 */
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const user = await User.findById(id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Optionally include recent reports count or recent moderation cases
  const recentReports = await Report.find({ reportedUser: user._id }).sort({ createdAt: -1 }).limit(10).lean();

  res.json({ user, recentReports });
});

/**
 * Promote user to admin
 */
const promoteToAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user id' });

  // prevent demoting or promoting the same user if already admin? we allow idempotent promote
  const user = await User.findByIdAndUpdate(id, { isAdmin: true }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  // notify user
  try {
    await notificationService.createAndSend({
      userId: user._id,
      type: 'system',
      title: 'You are now an admin',
      body: 'Your account has been granted administrative privileges.',
    });
  } catch (err) {
    console.error('notify promoteToAdmin failed', err);
  }

  res.json({ message: 'User promoted to admin', user });
});

/**
 * Demote user from admin
 */
const demoteFromAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user id' });

  // Prevent admin from demoting themselves via API (safety)
  if (String(req.user._id) === String(id)) {
    return res.status(400).json({ message: 'You cannot demote yourself' });
  }

  const user = await User.findByIdAndUpdate(id, { isAdmin: false }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  try {
    await notificationService.createAndSend({
      userId: user._id,
      type: 'system',
      title: 'Admin privileges removed',
      body: 'Your administrative privileges were removed by another administrator.',
    });
  } catch (err) {
    console.error('notify demoteFromAdmin failed', err);
  }

  res.json({ message: 'User demoted from admin', user });
});

/**
 * Suspend a user:
 *  - body: { days }   -> suspension for `days` days from now
 *  - OR body: { until } -> ISO date string for suspendedUntil
 *  - optional: reason
 */
const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { days, until, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user id' });

  let suspendedUntil = null;
  if (typeof until === 'string' && until.trim()) {
    const d = new Date(until);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid until date' });
    suspendedUntil = d;
  } else {
    const dDays = Math.max(1, parseInt(days || '7', 10));
    suspendedUntil = new Date(Date.now() + dDays * 24 * 60 * 60 * 1000);
  }

  const user = await User.findByIdAndUpdate(id, { suspendedUntil }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  try {
    await notificationService.createAndSend({
      userId: user._id,
      type: 'suspension',
      title: 'Account suspended',
      body: `Your account has been suspended until ${suspendedUntil.toISOString()}. ${reason ? 'Reason: ' + reason : ''}`,
      data: { suspendedUntil: suspendedUntil.toISOString() },
    });
  } catch (err) {
    console.error('notify suspendUser failed', err);
  }

  res.json({ message: 'User suspended', user });
});

/**
 * Unsuspend user (clear suspendedUntil)
 */
const unsuspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user id' });

  const user = await User.findByIdAndUpdate(id, { suspendedUntil: null }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  try {
    await notificationService.createAndSend({
      userId: user._id,
      type: 'system',
      title: 'Account reinstated',
      body: 'Your account has been reinstated and you may log in again.',
    });
  } catch (err) {
    console.error('notify unsuspendUser failed', err);
  }

  res.json({ message: 'User unsuspended', user });
});

/**
 * Reset the user's report count (admin action)
 */
const resetReports = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user id' });

  const user = await User.findByIdAndUpdate(id, { reportCount: 0 }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({ message: 'User report count reset', user });
});

/**
 * Mark user as verified/unverified
 * Body: { verified: true/false }
 */
const verifyUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verified } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid user id' });
  if (typeof verified !== 'boolean') return res.status(400).json({ message: 'verified must be boolean' });

  const user = await User.findByIdAndUpdate(id, { isVerified: verified }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  try {
    await notificationService.createAndSend({
      userId: user._id,
      type: 'system',
      title: verified ? 'You are verified' : 'Verification removed',
      body: verified ? 'Your account has been marked as verified by an administrator.' : 'Verification badge removed by an administrator.',
    });
  } catch (err) {
    console.error('notify verifyUser failed', err);
  }

  res.json({ message: `User verification updated to ${verified}`, user });
});

module.exports = {
  listUsers,
  getUser,
  promoteToAdmin,
  demoteFromAdmin,
  suspendUser,
  unsuspendUser,
  resetReports,
  verifyUser,
};
