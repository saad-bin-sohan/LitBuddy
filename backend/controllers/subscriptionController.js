// backend/controllers/subscriptionController.js

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

/**
 * GET /api/subscription
 * Return current user's subscription info (plan + maxActiveConversations)
 */
const getSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('plan maxActiveConversations');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ plan: user.plan, maxActiveConversations: user.maxActiveConversations });
});

/**
 * POST /api/subscription/upgrade
 * Simulated upgrade endpoint (no payment). Sets plan to 'premium' and optionally adjusts limit.
 * body: { maxActiveConversations? } — optional desired limit (will be capped)
 */
const upgradeSubscription = asyncHandler(async (req, res) => {
  const { maxActiveConversations } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Simulate upgrade — in real app integrate with Stripe and verify payment.
  user.plan = 'premium';

  // Determine new limit: if provided use it, else default 20. Cap at 100.
  let newLimit = typeof maxActiveConversations === 'number' ? Math.floor(maxActiveConversations) : 20;
  newLimit = Math.max(1, Math.min(100, newLimit));
  user.maxActiveConversations = newLimit;

  await user.save();

  res.json({ message: 'Subscription upgraded (simulated)', plan: user.plan, maxActiveConversations: user.maxActiveConversations });
});

/**
 * POST /api/subscription/downgrade
 * Downgrades to free plan and resets limit to 3.
 */
const downgradeSubscription = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.plan = 'free';
  user.maxActiveConversations = 3;
  await user.save();

  res.json({ message: 'Subscription downgraded to free', plan: user.plan, maxActiveConversations: user.maxActiveConversations });
});

module.exports = {
  getSubscription,
  upgradeSubscription,
  downgradeSubscription,
};
