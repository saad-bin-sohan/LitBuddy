const test = require('node:test');
const assert = require('node:assert/strict');

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
