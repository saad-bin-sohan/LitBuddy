/* eslint-disable no-console */
const assert = require('node:assert/strict');

const BASE_URL = (process.env.E2E_BASE_URL || 'http://localhost:5001').replace(/\/+$/, '');
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing E2E_EMAIL or E2E_PASSWORD environment variables.');
  process.exit(1);
}

const cookieJar = new Map();

function mergeSetCookie(setCookieHeaders = []) {
  for (const header of setCookieHeaders) {
    const [pair] = String(header).split(';');
    const [name, value] = pair.split('=');
    if (name && value !== undefined) {
      cookieJar.set(name.trim(), value.trim());
    }
  }
}

function cookieHeader() {
  if (cookieJar.size === 0) return '';
  return Array.from(cookieJar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  mergeSetCookie(res.headers.getSetCookie ? res.headers.getSetCookie() : []);
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

async function main() {
  const unauth = await request('/api/profile/me');
  assert.equal(unauth.status, 401, 'Expected unauthenticated profile check to return 401');

  const login = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  assert.equal(login.status, 200, `Login failed: ${JSON.stringify(login.body)}`);

  const profile = await request('/api/profile/me');
  assert.equal(profile.status, 200, `Profile failed: ${JSON.stringify(profile.body)}`);

  const clubs = await request('/api/clubs');
  assert.equal(clubs.status, 200, `Clubs failed: ${JSON.stringify(clubs.body)}`);

  const achievements = await request('/api/challenges/achievements?page=1&limit=20');
  assert.equal(
    achievements.status,
    200,
    `Challenge achievements failed: ${JSON.stringify(achievements.body)}`
  );

  const leaderboard = await request('/api/challenges/leaderboard/global?period=all');
  assert.equal(
    leaderboard.status,
    200,
    `Global leaderboard failed: ${JSON.stringify(leaderboard.body)}`
  );

  console.log('E2E smoke checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
