// backend/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many auth requests from this IP, please try again later.',
});

const contentReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many content requests from this IP, please slow down.',
});

const supportSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many support requests from this IP, please try again later.',
});

module.exports = { authLimiter, contentReadLimiter, supportSubmitLimiter };
