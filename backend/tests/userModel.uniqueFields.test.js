// backend/tests/userModel.uniqueFields.test.js
//
// Regression coverage for the 2026-09 sign-up bug: `email`, `phone`,
// `googleId` and `googleEmail` are `{ unique: true, sparse: true }`, but
// a sparse index only excludes documents where the field is completely
// *absent* -- not documents where it's present as an empty string.
// registerUser() was writing `phone: ''` straight from an optional,
// blank form field, so the first blank sign-up planted a `phone: ""`
// document and the very next one hit:
//   E11000 duplicate key error collection: test.users index: phone_1
//   dup key: { phone: "" }
//
// See the file-level comment in backend/models/userModel.js for the
// full root-cause writeup and backend/scripts/fixBlankUniqueFields.js
// for the one-time cleanup of already-affected documents.
//
// Pure schema-level tests -- no DB connection required, matching the
// existing bookModelIndexes.test.js / userModel.gender.test.js
// convention in this directory.
//
// Note: `validateSync()` does not run the full Mongoose validation
// pipeline in mongoose@9 (it's deprecated in favor of the async
// `validate()`), but the fix here is a SchemaType `set` transform, which
// runs at assignment time -- before validation of any kind -- so it is
// verified below against construction, `validateSync()`, and async
// `validate()` alike.

const test = require('node:test');
const assert = require('node:assert/strict');

const User = require('../models/userModel');

function buildUser(overrides = {}) {
  return new User({
    name: 'Test Reader',
    password: 'password1',
    age: 21,
    gender: 'Woman',
    ...overrides,
  });
}

function hasOwn(doc, field) {
  return Object.prototype.hasOwnProperty.call(doc.toObject({ minimize: false }), field);
}

test('blank phone/email are normalized away at construction time (before any save)', () => {
  const user = buildUser({ phone: '', email: '' });
  assert.equal(user.phone, undefined);
  assert.equal(user.email, undefined);
  assert.equal(hasOwn(user, 'phone'), false, 'phone must be entirely absent, not just falsy');
  assert.equal(hasOwn(user, 'email'), false, 'email must be entirely absent, not just falsy');
});

test('whitespace-only phone/email are also treated as blank', () => {
  const user = buildUser({ phone: '   ', email: '\t\n ' });
  assert.equal(hasOwn(user, 'phone'), false);
  assert.equal(hasOwn(user, 'email'), false);
});

test('blank google fields are normalized the same way', () => {
  const user = buildUser({ googleId: '', googleEmail: '   ' });
  assert.equal(hasOwn(user, 'googleId'), false);
  assert.equal(hasOwn(user, 'googleEmail'), false);
});

test('a real phone/email is preserved and trimmed, not touched by the blank normalizer', () => {
  const user = buildUser({ phone: '  +15551234567  ', email: '  reader@example.com  ' });
  assert.equal(user.phone, '+15551234567');
  assert.equal(user.email, 'reader@example.com');
});

test('normalization also applies to a plain assignment after construction, not just constructor input', () => {
  const user = buildUser();
  user.phone = '';
  assert.equal(hasOwn(user, 'phone'), false);
});

test('normalization survives validateSync()', () => {
  const user = buildUser({ phone: '', email: '' });
  const err = user.validateSync();
  assert.equal(err, undefined);
  assert.equal(hasOwn(user, 'phone'), false);
  assert.equal(hasOwn(user, 'email'), false);
});

test('normalization survives async validate()', async () => {
  const user = buildUser({ phone: '', email: '' });
  await user.validate();
  assert.equal(hasOwn(user, 'phone'), false);
  assert.equal(hasOwn(user, 'email'), false);
});

test('two independently-built blank-phone users never produce a colliding indexable value', () => {
  // This is the direct regression check for the reported bug: previously
  // both of these would serialize with an indexed `phone: ""`, which is
  // exactly what MongoDB's unique index rejected on the second insert.
  const userA = buildUser({ name: 'A', phone: '' });
  const userB = buildUser({ name: 'B', phone: '' });
  assert.equal(hasOwn(userA, 'phone'), false);
  assert.equal(hasOwn(userB, 'phone'), false);
});

test('email/phone remain required-at-least-one at the application layer (schema itself allows both blank)', () => {
  // The "at least one of email/phone" rule lives in authController, not
  // the schema (a Google user legitimately has neither at times). Confirm
  // the schema itself doesn't error when both are blank so we don't
  // accidentally couple this fix to that separate business rule.
  const user = buildUser({ phone: '', email: '' });
  const err = user.validateSync();
  assert.equal(err?.errors?.phone, undefined);
  assert.equal(err?.errors?.email, undefined);
});

test('stripBlankUniqueFields (query-update path) unsets blank fields from an implicit $set', () => {
  const update = { name: 'A', phone: '' };
  User.stripBlankUniqueFields(update);
  assert.deepEqual(update, { name: 'A', $unset: { phone: '' } });
});

test('stripBlankUniqueFields unsets blank fields from an explicit $set and trims valid ones', () => {
  const update = { $set: { name: 'A', phone: '', email: '  x@y.com  ' } };
  User.stripBlankUniqueFields(update);
  assert.deepEqual(update, { $set: { name: 'A', email: 'x@y.com' }, $unset: { phone: '' } });
});

test('stripBlankUniqueFields merges into a pre-existing $unset instead of clobbering it', () => {
  const update = { $set: { phone: '' }, $unset: { bio: '' } };
  User.stripBlankUniqueFields(update);
  assert.deepEqual(update, { $set: {}, $unset: { bio: '', phone: '' } });
});

test('stripBlankUniqueFields leaves updates with no tracked fields untouched', () => {
  const update = { $set: { bio: 'hello' } };
  User.stripBlankUniqueFields(update);
  assert.deepEqual(update, { $set: { bio: 'hello' } });
});

test('stripBlankUniqueFields tolerates a missing/empty update object', () => {
  assert.equal(User.stripBlankUniqueFields(null), null);
  assert.equal(User.stripBlankUniqueFields(undefined), undefined);
  assert.deepEqual(User.stripBlankUniqueFields({}), {});
});
