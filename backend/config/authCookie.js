const DEFAULT_COOKIE_NAME = 'token';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const VALID_SAME_SITE = new Set(['lax', 'strict', 'none']);

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function resolveSameSite(rawValue) {
  const normalized = String(rawValue || '').trim().toLowerCase();
  if (!VALID_SAME_SITE.has(normalized)) return 'Lax';
  if (normalized === 'none') return 'None';
  if (normalized === 'strict') return 'Strict';
  return 'Lax';
}

const AUTH_COOKIE_NAME = (process.env.AUTH_COOKIE_NAME || DEFAULT_COOKIE_NAME).trim() || DEFAULT_COOKIE_NAME;
const AUTH_COOKIE_DOMAIN = (process.env.AUTH_COOKIE_DOMAIN || '').trim() || undefined;
const AUTH_COOKIE_SAME_SITE = resolveSameSite(process.env.AUTH_COOKIE_SAME_SITE || 'Lax');
const AUTH_COOKIE_SECURE = parseBoolean(
  process.env.AUTH_COOKIE_SECURE,
  process.env.NODE_ENV === 'production'
);
const AUTH_ALLOW_BEARER_FALLBACK = parseBoolean(process.env.AUTH_ALLOW_BEARER_FALLBACK, true);

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: AUTH_COOKIE_SECURE,
    sameSite: AUTH_COOKIE_SAME_SITE,
    path: '/',
    ...(AUTH_COOKIE_DOMAIN ? { domain: AUTH_COOKIE_DOMAIN } : {}),
  };
}

function getSetCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: ONE_WEEK_MS,
  };
}

function getClearCookieOptions() {
  return getBaseCookieOptions();
}

function readCookieToken(req) {
  if (!req || !req.cookies) return null;
  if (req.cookies[AUTH_COOKIE_NAME]) return req.cookies[AUTH_COOKIE_NAME];
  if (AUTH_COOKIE_NAME !== DEFAULT_COOKIE_NAME && req.cookies[DEFAULT_COOKIE_NAME]) {
    return req.cookies[DEFAULT_COOKIE_NAME];
  }
  return null;
}

function clearAuthCookies(res) {
  if (!res || typeof res.clearCookie !== 'function') return;
  const options = getClearCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, options);
  if (AUTH_COOKIE_NAME !== DEFAULT_COOKIE_NAME) {
    res.clearCookie(DEFAULT_COOKIE_NAME, options);
  }
}

module.exports = {
  AUTH_COOKIE_NAME,
  AUTH_ALLOW_BEARER_FALLBACK,
  getSetCookieOptions,
  getClearCookieOptions,
  readCookieToken,
  clearAuthCookies,
};
