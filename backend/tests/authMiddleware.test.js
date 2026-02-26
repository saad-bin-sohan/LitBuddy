const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { protect } = require('../middleware/authMiddleware');

function createMockResponse() {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
    clearCookie() {
      return this;
    },
  };
  return res;
}

function createMockRequest(overrides = {}) {
  return {
    headers: {},
    cookies: {},
    originalUrl: '/api/profile/me',
    url: '/api/profile/me',
    log: {
      warn: () => {},
      debug: () => {},
      error: () => {},
      info: () => {},
    },
    ...overrides,
  };
}

test('protect returns AUTH_NO_TOKEN for legacy Bearer undefined', async () => {
  const req = createMockRequest({
    headers: { authorization: 'Bearer undefined' },
  });
  const res = createMockResponse();

  await protect(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, 'AUTH_NO_TOKEN');
});

test('protect returns AUTH_TOKEN_MALFORMED for malformed bearer token', async () => {
  const req = createMockRequest({
    headers: { authorization: 'Bearer malformed-token' },
  });
  const res = createMockResponse();

  await protect(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, 'AUTH_TOKEN_MALFORMED');
});

test('protect returns AUTH_TOKEN_SCOPE_INVALID for websocket-scoped bearer token', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'unit-test-secret';

  const token = jwt.sign(
    {
      id: '507f1f77bcf86cd799439011',
      scope: 'ws',
    },
    process.env.JWT_SECRET,
    { expiresIn: 60 }
  );

  const req = createMockRequest({
    headers: { authorization: `Bearer ${token}` },
  });
  const res = createMockResponse();

  await protect(req, res, () => {});

  assert.equal(res.statusCode, 401);
  assert.equal(res.payload.code, 'AUTH_TOKEN_SCOPE_INVALID');

  if (previousSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousSecret;
  }
});
