// backend/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many auth requests from this IP, please try again later.',
});

module.exports = { authLimiter };