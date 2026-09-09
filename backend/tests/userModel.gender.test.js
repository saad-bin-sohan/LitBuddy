// backend/tests/userModel.gender.test.js
//
// Regression coverage for the 2026-09 sign-up bug: Register.js was
// submitting retired gender values (Male/Female/Other/Prefer not to say)
// against the widened enum introduced in commit e80a92a, so every
// registration failed Mongoose's validator. See backend/config/genderOptions.js
// for the current single source of truth.
//
// Pure schema-level tests — validateSync() runs the model's own validators
// in-memory with no DB connection required, matching the existing
// bookModelIndexes.test.js / challengeModel.test.js convention in this
// directory.

const test = require('node:test');
const assert = require('node:assert/strict');

const User = require('../models/userModel');
const { GENDER_OPTIONS } = require('../config/genderOptions');

function buildUser(overrides = {}) {
  return new User({
    name: 'Test Reader',
    password: 'password1',
    age: 21,
    gender: 'Woman',
    ...overrides,
  });
}

test('User schema accepts every current gender option', () => {
  for (const value of GENDER_OPTIONS) {
    const err = buildUser({ gender: value }).validateSync();
    assert.equal(err?.errors?.gender, undefined, `expected "${value}" to be a valid gender`);
  }
});

test('User schema rejects the retired pre-2026 gender values', () => {
  // These are exactly the values Register.js used to submit before the fix,
  // plus the fourth option ("Prefer not to say") that was never valid on
  // the backend at any point.
  for (const value of ['Male', 'Female', 'Other', 'Prefer not to say']) {
    const err = buildUser({ gender: value }).validateSync();
    assert.ok(err?.errors?.gender, `expected "${value}" to be rejected by the gender enum`);
  }
});

test('gender is required for non-Google users', () => {
  const err = buildUser({ gender: undefined }).validateSync();
  assert.ok(err?.errors?.gender, 'expected a missing gender to fail validation');
});

test('gender is not required for Google-authenticated users', () => {
  const err = buildUser({ gender: undefined, isGoogleUser: true, password: undefined, age: undefined }).validateSync();
  assert.equal(err?.errors?.gender, undefined);
});

test('genderCustom accepts free text up to 40 characters and defaults to empty', () => {
  const described = buildUser({ gender: 'Self-described', genderCustom: 'Genderfluid' });
  assert.equal(described.validateSync(), undefined);
  assert.equal(described.genderCustom, 'Genderfluid');

  const untouched = buildUser();
  assert.equal(untouched.genderCustom, '');
});

test('genderCustom over 40 characters fails validation', () => {
  const tooLong = buildUser({ gender: 'Self-described', genderCustom: 'x'.repeat(41) });
  const err = tooLong.validateSync();
  assert.ok(err?.errors?.genderCustom, 'expected genderCustom over 40 chars to fail validation');
});

test('interestedIn accepts Woman/Man/Non-binary but not Self-described', () => {
  const ok = buildUser({ interestedIn: ['Woman', 'Man', 'Non-binary'] });
  assert.equal(ok.validateSync(), undefined);

  const bad = buildUser({ interestedIn: ['Self-described'] });
  const err = bad.validateSync();
  assert.ok(err?.errors?.['interestedIn.0'] || err, 'expected Self-described to be rejected as an interestedIn value');
});
