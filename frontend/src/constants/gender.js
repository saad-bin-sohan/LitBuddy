// frontend/src/constants/gender.js
//
// Single source of truth for the gender options shown in the UI. Must stay
// in sync with the `gender` enum in backend/models/userModel.js (mirrored
// on the backend at backend/config/genderOptions.js).
//
// This was introduced because Register.js and ProfileWizard.js each used
// to declare their own copy of this list, and they silently drifted apart
// after ProfileWizard.js was updated for the matching-system refresh while
// Register.js was not — that drift is what caused every sign-up to fail
// with a "not a valid enum value for path `gender`" error. Importing from
// one place instead of two makes that class of bug impossible going
// forward.

export const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Self-described'];

// Who a user can express interest in (matching preference). Deliberately
// excludes 'Self-described' — that's a self-description someone gives for
// their own identity, not a category another user searches for.
export const INTERESTED_IN_OPTIONS = GENDER_OPTIONS.filter((g) => g !== 'Self-described');
