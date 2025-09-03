// backend/jobs/migrateChatsAndParticipants.js
/**
 * One-time migration script:
 * - Ensures participants arrays are sorted
 * - Converts boolean `paused` => status
 * - Sets status to 'active' if neither paused nor closed
 *
 * Run with: node backend/jobs/migrateChatsAndParticipants.js
 */

const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Chat = require('../models/chatModel');

(async () => {
  try {
    await connectDB();
    console.log('Connected. Starting migration...');

    const cursor = Chat.find().cursor();
    let count = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      let modified = false;

      // participants sort
      if (Array.isArray(doc.participants) && doc.participants.length > 1) {
        const sorted = doc.participants.map(String).sort();
        if (JSON.stringify(sorted) !== JSON.stringify(doc.participants.map(String))) {
          doc.participants = sorted.map((s) => mongoose.Types.ObjectId(s));
          modified = true;
        }
      }

      // migrate paused boolean if present
      if (typeof doc.paused !== 'undefined') {
        if (doc.paused && doc.status !== 'paused') {
          doc.status = 'paused';
          modified = true;
        } else if (!doc.paused && (!doc.status || doc.status === 'active')) {
          doc.status = 'active';
          modified = true;
        }
        // remove the old field if it exists
        if (doc.toObject().hasOwnProperty('paused')) {
          doc.set('paused', undefined, { strict: false });
          modified = true;
        }
      } else {
        // if no status set, ensure default
        if (!doc.status) {
          doc.status = 'active';
          modified = true;
        }
      }

      if (modified) {
        await doc.save();
        count++;
      }
    }

    console.log(`Migration completed. Updated ${count} chat docs.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
