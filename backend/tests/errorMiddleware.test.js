// backend/tests/errorMiddleware.test.js
//
// Regression coverage: raw MongoDB E11000 duplicate-key errors were
// being sent straight to the client as `err.message`, e.g.
//   "E11000 duplicate key error collection: test.users index: phone_1
//    dup key: { phone: "" }"
// which is both an internal-detail leak and confusing to a user who
// never entered a phone number. errorHandler now translates these into
// a clean message with a 409 status. See backend/middleware/errorMiddleware.js
// for the full writeup.
//
// Exercises the real Express middleware with a minimal fake
// req/res/logger so no server needs to be booted.

const test = require('node:test');
const assert = require('node:assert/strict');

const { errorHandler } = require('../middleware/errorMiddleware');

function buildRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function buildReq() {
  return {
    requestId: 'test-req',
    method: 'POST',
    originalUrl: '/api/auth/register',
    log: { error() {}, warn() {} }, // getLogger(req) returns req.log as-is when present
  };
}

test('a duplicate phone key error becomes a clean 409 message, not the raw Mongo string', () => {
  const err = new Error(
    'E11000 duplicate key error collection: test.users index: phone_1 dup key: { phone: "" }'
  );
  err.code = 11000;
  err.keyValue = { phone: '' };

  const res = buildRes();
  errorHandler(err, buildReq(), res, () => {});

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, 'That phone number is already in use on another account.');
  assert.ok(!res.body.message.includes('E11000'), 'response must not leak the raw driver message');
  assert.ok(!res.body.message.includes('test.users'), 'response must not leak the collection name');
});

test('a duplicate email key error is labeled correctly', () => {
  const err = new Error('E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "a@b.com" }');
  err.code = 11000;
  err.keyValue = { email: 'a@b.com' };

  const res = buildRes();
  errorHandler(err, buildReq(), res, () => {});

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, 'That email address is already in use on another account.');
});

test('a duplicate key error with no keyValue falls back to a generic message instead of crashing', () => {
  const err = new Error('E11000 duplicate key error');
  err.code = 11000;

  const res = buildRes();
  errorHandler(err, buildReq(), res, () => {});

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, 'That value is already in use on another account.');
});

test('a non-duplicate-key error is passed through unchanged (existing behavior preserved)', () => {
  const err = new Error('Something else went wrong');

  const res = buildRes();
  errorHandler(err, buildReq(), res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, 'Something else went wrong');
});

test('a non-duplicate-key error still respects a status code the controller already set', () => {
  const err = new Error('Not allowed');
  const res = buildRes();
  res.status(403);
  errorHandler(err, buildReq(), res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Not allowed');
});
