/**
 * One-time cleanup for the 2026-09 blank-phone/email sign-up bug.
 *
 * Root cause (fixed in backend/models/userModel.js): `email`, `phone`,
 * `googleId` and `googleEmail` are `{ unique: true, sparse: true }`.
 * A sparse index only excludes documents where the field is completely
 * *absent* -- not documents where it's present as an empty string.
 * registerUser() was writing e.g. `phone: ''` for anyone who left the
 * (optional) phone field blank, so the first blank sign-up planted a
 * `phone: ""` document and the very next one hit:
 *   E11000 duplicate key error collection: test.users index: phone_1
 *   dup key: { phone: "" }
 *
 * The schema fix stops this from happening for any *new* write, but it
 * does nothing for documents that already have a stored `""` (or
 * whitespace-only) value from before the fix was deployed -- Mongo
 * doesn't retroactively re-run application code against existing rows.
 * This script finds and `$unset`s those specific fields on those
 * specific documents so the sparse index goes back to correctly
 * excluding them, matching what every future blank sign-up will do.
 *
 * Safe to run multiple times (it's a no-op once nothing matches) and
 * safe to run before *or* after deploying the userModel.js fix.
 *
 * Usage:
 *   node scripts/fixBlankUniqueFields.js            # applies the fix
 *   node scripts/fixBlankUniqueFields.js --dry-run   # reports only, writes nothing
 */

const mongoose = require('mongoose');
const User = require('../models/userModel');

// Connect to MongoDB (same convention as the other scripts in this folder)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/litbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const DRY_RUN = process.argv.includes('--dry-run');

// Keep in sync with SPARSE_UNIQUE_FIELDS in backend/models/userModel.js.
const FIELDS = ['email', 'phone', 'googleId', 'googleEmail'];

// Matches '' as well as whitespace-only strings ('   ', '\t', etc.), since
// that's exactly what a stray keystroke plus this same bug could have
// stored before the schema-level trim was in place.
const BLANK_VALUE_FILTER = { $regex: /^\s*$/ };

async function fixBlankUniqueFields() {
  try {
    console.log(`Starting blank unique-field cleanup${DRY_RUN ? ' (DRY RUN -- no writes will be made)' : ''}...`);

    let totalMatched = 0;
    let totalUpdated = 0;

    for (const field of FIELDS) {
      const filter = { [field]: BLANK_VALUE_FILTER };
      const matches = await User.find(filter, { _id: 1, name: 1, email: 1, phone: 1, [field]: 1 });

      if (matches.length === 0) {
        console.log(`- ${field}: no blank values found`);
        continue;
      }

      console.log(`- ${field}: found ${matches.length} document(s) with a blank stored value`);
      totalMatched += matches.length;

      for (const doc of matches) {
        console.log(
          `    id=${doc._id} name=${JSON.stringify(doc.name)} ` +
            `${field}=${JSON.stringify(doc[field])} -> will ${DRY_RUN ? 'be unset (dry run)' : 'unset'}`
        );
      }

      if (!DRY_RUN) {
        // updateMany + $unset bypasses document middleware entirely (no
        // password re-hash, no hasCompletedSetup recompute) -- this
        // migration should touch this one field and nothing else.
        const result = await User.updateMany(filter, { $unset: { [field]: '' } });
        const modified = result.modifiedCount ?? result.nModified ?? 0;
        console.log(`  -> unset '${field}' on ${modified} document(s)`);
        totalUpdated += modified;
      }
    }

    console.log('\nBlank unique-field cleanup completed:');
    console.log(`- Matched: ${totalMatched} field/document combination(s) across ${FIELDS.join(', ')}`);
    if (DRY_RUN) {
      console.log('- Dry run: no documents were modified. Re-run without --dry-run to apply.');
    } else {
      console.log(`- Updated: ${totalUpdated} field/document combination(s)`);
    }
  } catch (error) {
    console.error('Error cleaning up blank unique fields:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

fixBlankUniqueFields();
