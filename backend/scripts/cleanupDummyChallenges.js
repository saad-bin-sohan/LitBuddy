// backend/scripts/cleanupDummyChallenges.js
/*
 * Deletes previously seeded dummy reading challenges by matching known titles.
 * Safe to run multiple times. No effect if none found.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').join(__dirname, '..', '..', '.env') });

const connectDB = require('../config/db');
const Challenge = require('../models/challengeModel');

async function main() {
  try {
    await connectDB();

    const dummyTitles = [
      'Summer Reading Adventure',
      'Mystery & Thriller Marathon',
      'Reading Streak Challenge',
      'Fantasy World Explorer',
      'Holiday Reading Cozy',
      'Classic Literature Journey',
    ];

    const result = await Challenge.deleteMany({ title: { $in: dummyTitles } });
    console.log(`Deleted ${result.deletedCount || 0} dummy challenges.`);
  } catch (err) {
    console.error('Cleanup failed:', err?.message || err);
  } finally {
    await mongoose.connection.close();
  }
}

main();


