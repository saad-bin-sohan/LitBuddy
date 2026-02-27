const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { getLogger, logger } = require('../utils/logger');
const {
  AUTH_ALLOW_BEARER_FALLBACK,
  readCookieToken,
  clearAuthCookies,
} = require('../config/authCookie');

const LEGACY_INVALID_TOKEN_VALUES = new Set(['', 'undefined', 'null', 'nan']);

const looksLikeJwt = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value);

const mask = (value) =>
  typeof value === 'string' ? `${value.slice(0, 8)}...len=${value.length}` : String(value);

function normalizeToken(raw) {
  if (raw === undefined || raw === null) return null;
  const token = String(raw).trim();
  if (LEGACY_INVALID_TOKEN_VALUES.has(token.toLowerCase())) return null;
  return token || null;
}

function extractBearerToken(req) {
  if (!AUTH_ALLOW_BEARER_FALLBACK) return null;
  const header = req.headers && req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  return normalizeToken(header.slice(7));
}

function unauthorized(res, code, message = 'Not authorized') {
  return res.status(401).json({ message, code });
}

const protect = async (req, res, next) => {
  const requestLogger = getLogger(req);
  let source = 'none';
  let token = null;

  const cookieToken = normalizeToken(readCookieToken(req));
  if (cookieToken) {
    token = cookieToken;
    source = 'cookie';
  } else if (readCookieToken(req) && !cookieToken) {
    source = 'cookie';
    clearAuthCookies(res);
  }

  if (!token) {
    const bearerToken = extractBearerToken(req);
    if (bearerToken) {
      token = bearerToken;
      source = 'auth header';
    }
  }

  if (!token) {
    requestLogger.warn(
      {
        path: req.originalUrl || req.url,
        source,
        hasAuthorizationHeader: !!req.headers.authorization,
        hasTokenCookie: !!readCookieToken(req),
      },
      'auth.no_token'
    );
    return unauthorized(res, 'AUTH_NO_TOKEN', 'Not authorized, no token');
  }

  if (!looksLikeJwt(token)) {
    requestLogger.warn(
      {
        path: req.originalUrl || req.url,
        source,
        tokenPreview: mask(token),
      },
      'auth.malformed_token'
    );
    if (source === 'cookie') clearAuthCookies(res);
    return unauthorized(res, 'AUTH_TOKEN_MALFORMED', 'Not authorized, token malformed');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.scope === 'ws') {
      requestLogger.warn(
        {
          path: req.originalUrl || req.url,
          source,
        },
        'auth.scope_invalid_for_route'
      );
      if (source === 'cookie') clearAuthCookies(res);
      return unauthorized(res, 'AUTH_TOKEN_SCOPE_INVALID', 'Not authorized, token scope invalid');
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      requestLogger.warn(
        {
          path: req.originalUrl || req.url,
          source,
        },
        'auth.user_not_found'
      );
      return unauthorized(res, 'AUTH_USER_NOT_FOUND', 'Not authorized, user not found');
    }

    const now = new Date();
    const isSuspended = user.suspendedUntil && user.suspendedUntil > now;
    const isAdmin = !!(user.isAdmin || user.role === 'admin');

    if (isSuspended && !isAdmin) {
      requestLogger.warn(
        {
          path: req.originalUrl || req.url,
          userId: String(user._id),
          suspendedUntil: user.suspendedUntil,
        },
        'auth.suspended_user_blocked'
      );
      return res.status(403).json({
        message: `Account suspended until ${user.suspendedUntil.toISOString()}`,
        code: 'AUTH_SUSPENDED',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    requestLogger.warn(
      {
        err: error,
        path: req.originalUrl || req.url,
        source,
        tokenPreview: mask(token),
      },
      'auth.token_verification_failed'
    );

    if (source === 'cookie') clearAuthCookies(res);
    return unauthorized(res, 'AUTH_TOKEN_FAILED', 'Not authorized, token failed');
  }
};

const optionalProtect = async (req, _res, next) => {
  try {
    let token = normalizeToken(readCookieToken(req));
    if (!token) {
      token = extractBearerToken(req);
    }

    if (!token || !looksLikeJwt(token)) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.scope === 'ws') {
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next();
    }

    const now = new Date();
    const isSuspended = user.suspendedUntil && user.suspendedUntil > now;
    const isAdmin = !!(user.isAdmin || user.role === 'admin');
    if (isSuspended && !isAdmin) {
      return next();
    }

    req.user = user;
    return next();
  } catch (_err) {
    return next();
  }
};

const verifyTokenForSocket = async (rawToken) => {
  try {
    if (!rawToken) return null;

    let token = rawToken;
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.slice(7);
    }
    token = normalizeToken(token);
    if (!token || !looksLikeJwt(token)) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return null;

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return null;

    const now = new Date();
    const isSuspended = user.suspendedUntil && user.suspendedUntil > now;
    const isAdmin = !!(user.isAdmin || user.role === 'admin');
    if (isSuspended && !isAdmin) return null;

    return user;
  } catch (err) {
    logger.debug({ err }, 'auth.socket_token_verification_failed');
    return null;
  }
};

module.exports = { protect, optionalProtect, verifyTokenForSocket };
