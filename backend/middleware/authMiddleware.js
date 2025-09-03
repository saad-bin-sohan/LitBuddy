// backend/middleware/authMiddleware.js
/**
 * protect middleware
 *  - Verifies JWT token and attaches user (without password) to req.user
 *  - Enforces suspension blocking for non-admin users (if suspendedUntil > now).
 *
 * Implementation: prefer token from httpOnly cookie `token`. For compatibility,
 * this will fall back to Authorization header if present.
 *
 * Extra: quick format-check to avoid calling jwt.verify on obviously-bad strings,
 * clear cookie when malformed/failed to help client self-heal, and mask logs.
 *
 * Additional export: verifyTokenForSocket(token)
 *  - Lightweight helper that accepts a raw token string (optionally prefixed with "Bearer ")
 *  - Returns the User document (without password) or null if invalid/not found/suspended.
 *  - Intended for use in realtime handshakes (STOMP / WebSocket servers).
 */

const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const looksLikeJwt = (t) =>
  typeof t === 'string' && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(t);

const mask = (s) => (typeof s === 'string' ? `${s.slice(0, 8)}...len=${s.length}` : String(s));

const cookieClearOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'None',
  path: '/',
};

const protect = async (req, res, next) => {
  let token;
  let source = 'none';

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    source = 'cookie';
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    source = 'auth header';
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  // Quick format check to avoid jwt.verify on obviously-bad tokens
  if (!looksLikeJwt(token)) {
    console.warn(
      `authMiddleware: malformed token from ${source} at ${req.originalUrl} — preview=${mask(token)}; clearing cookie if present`
    );
    if (source === 'cookie') {
      // clear cookie so browser/client can recover
      res.clearCookie('token', cookieClearOptions);
    }
    return res.status(401).json({ message: 'Not authorized, token malformed' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user data (minus password) to request
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // If suspendedUntil in the future and the user is NOT an admin, block access
    const now = new Date();
    const isSuspended = user.suspendedUntil && user.suspendedUntil > now;
    const isAdmin = !!(user.isAdmin || user.role === 'admin');

    if (isSuspended && !isAdmin) {
      return res.status(403).json({
        message: `Account suspended until ${user.suspendedUntil.toISOString()}`,
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    // Masked, helpful logging
    console.error(
      'authMiddleware error:',
      error?.message || error,
      'path:',
      req.originalUrl,
      'source:',
      source,
      'preview:',
      mask(token)
    );

    // Clear cookie to help client recover if token was from cookie
    if (source === 'cookie') {
      res.clearCookie('token', cookieClearOptions);
    }
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * verifyTokenForSocket(token)
 * - Token may be "Bearer <token>" or raw token string.
 * - Returns User (without password) or null.
 * - Does not send HTTP responses (intended for handshake callbacks).
 */
const verifyTokenForSocket = async (rawToken) => {
  try {
    if (!rawToken) return null;
    let token = rawToken;
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }
    if (!looksLikeJwt(token)) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return null;

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return null;

    // Check suspension (same logic as protect)
    const now = new Date();
    const isSuspended = user.suspendedUntil && user.suspendedUntil > now;
    const isAdmin = !!(user.isAdmin || user.role === 'admin');

    if (isSuspended && !isAdmin) {
      return null;
    }

    return user;
  } catch (err) {
    // Silent failure — handshake code will treat as unauthenticated
    // but we log minimal info for debugging.
    // Do not include token contents in logs.
    // console.debug('verifyTokenForSocket failed:', err?.message || err);
    return null;
  }
};

module.exports = { protect, verifyTokenForSocket };