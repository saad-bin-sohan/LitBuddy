// backend/jobs/reconcileActiveCounts.js
/**
 * Recompute activeConversations per user from Chat collection and write to users.
 * Run: node backend/jobs/reconcileActiveCounts.js
 */

const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Chat = require('../models/chatModel');
const User = require('../models/userModel');

(async () => {
  try {
    await connectDB();
    console.log('Connected. Reconciling active conversation counts...');

    // Build aggregation: unwind participants where chat.status === 'active'
    const pipeline = [
      { $match: { status: 'active' } },
      { $unwind: '$participants' },
      { $group: { _id: '$participants', count: { $sum: 1 } } },
    ];

    const agg = await Chat.aggregate(pipeline);
    const counts = {};
    for (const row of agg) {
      counts[String(row._id)] = row.count;
    }

    // Set everyone's activeConversations to 0, then set from counts
    const users = await User.find().select('_id').lean();
    for (const u of users) {
      const c = counts[String(u._id)] || 0;
      await User.findByIdAndUpdate(u._id, { activeConversations: c });
    }

    console.log('Reconciliation complete.');
    process.exit(0);
  } catch (err) {
    console.error('Reconciliation failed:', err);
    process.exit(1);
  }
})();
