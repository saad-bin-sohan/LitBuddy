const mongoose = require('mongoose');
const User = require('../models/userModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/litbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Run this BEFORE deploying the widened gender enum in userModel.js.
// Existing documents still hold the old raw string values even though the
// current schema no longer lists them, so `find()` can still match on them —
// only `save()` validates against the new enum, which is why this script
// rewrites each value before anything else touches these documents.
const GENDER_MIGRATION_MAP = {
  Male: 'Man',
  Female: 'Woman',
  Other: 'Self-described',
};

async function migrateGenderValues() {
  try {
    console.log('Starting gender value migration...');

    const users = await User.find({ gender: { $in: Object.keys(GENDER_MIGRATION_MAP) } });
    console.log(`Found ${users.length} users with a legacy gender value`);

    let migratedCount = 0;

    for (const user of users) {
      const oldValue = user.gender;
      const newValue = GENDER_MIGRATION_MAP[oldValue];
      if (!newValue) continue;

      user.gender = newValue;

      // 'Other' had no free-text field before. Leave genderCustom blank
      // rather than guessing — a future profile-completion nudge can prompt
      // these specific users to fill it in, rather than us inventing text
      // on their behalf.
      if (oldValue === 'Other' && !user.genderCustom) {
        user.genderCustom = '';
      }

      await user.save();
      console.log(`Migrated user: ${user.email || user.phone} (${user.name}) - ${oldValue} -> ${newValue}`);
      migratedCount++;
    }

    console.log(`\nGender migration completed:`);
    console.log(`- Migrated: ${migratedCount} users`);
    console.log(`- Total scanned: ${users.length} users`);
  } catch (error) {
    console.error('Error migrating gender values:', error);
  } finally {
    mongoose.connection.close();
  }
}

migrateGenderValues();
