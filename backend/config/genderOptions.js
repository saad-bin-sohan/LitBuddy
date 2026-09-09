// backend/config/genderOptions.js
//
// Single source of truth for the User model's gender vocabulary.
// Introduced 2026-09 to close a gap from the matching-system refresh
// (commit e80a92a): that commit widened the enum in userModel.js and
// updated ProfileWizard.js, but the values were never centralized, which
// is how frontend/src/pages/Register.js was left on the retired
// ['Male','Female','Other'] list and every registration started failing
// Mongoose's enum validator.
//
// Anything that needs to read, write, or validate a user's `gender` field
// should import from here instead of re-declaring the list — that's the
// whole point: one list to update if this ever changes again.
//
// Mirrored on the frontend at frontend/src/constants/gender.js. The two
// are not (and can't easily be) imported from a single shared file since
// the frontend and backend are separate deployments (Vercel / Render),
// but they must always list the same values in the same order.

// Canonical, current gender values. 'Self-described' pairs with the
// free-text `genderCustom` field on the User model.
const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Self-described'];

// Who a user can express interest in (User.interestedIn). Deliberately
// excludes 'Self-described' — that's a self-description a person gives for
// their own identity, not a category someone else searches for as a
// matching preference.
const INTERESTED_IN_OPTIONS = GENDER_OPTIONS.filter((g) => g !== 'Self-described');

// Legacy -> current mapping, retired 2026-05 when the enum above was
// widened (see backend/scripts/migrateGenderValues.js, which used this
// exact mapping to migrate production data). Kept here — rather than
// deleted — so any code that might still be holding an old value (e.g. a
// hand-typed CLI flag someone copies from an old terminal history) can be
// normalized into a valid value instead of crashing outright.
const LEGACY_GENDER_MAP = {
  Male: 'Man',
  Female: 'Woman',
  Other: 'Self-described',
};

module.exports = { GENDER_OPTIONS, INTERESTED_IN_OPTIONS, LEGACY_GENDER_MAP };
