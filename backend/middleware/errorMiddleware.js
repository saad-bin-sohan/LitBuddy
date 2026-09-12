// backend/middleware/errorMiddleware.js
const { getLogger } = require('../utils/logger');

// Handle 404 - Route Not Found
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// User-facing labels for the duplicate-key message below. Keep in sync
// with the `unique: true` fields on backend/models/userModel.js.
const DUPLICATE_KEY_FIELD_LABELS = {
  email: 'email address',
  phone: 'phone number',
  googleId: 'Google account',
  googleEmail: 'Google account',
};

/**
 * Translates a raw MongoDB E11000 duplicate-key error into a clean,
 * user-safe message + status code.
 *
 * 2026-09 fix: this error was previously sent straight through to
 * `err.message` below, so a blank-phone sign-up collision surfaced to
 * the user as the raw driver string, e.g.:
 *   "E11000 duplicate key error collection: test.users index: phone_1
 *    dup key: { phone: "" }"
 * -- exposing internal collection/index names and being actively
 * confusing to a user who never typed a phone number at all. The root
 * cause of *why* two blank sign-ups could collide is fixed separately in
 * backend/models/userModel.js; this is the defense-in-depth layer so
 * that if a genuine duplicate ever reaches this point (someone re-using
 * a real email/phone/Google account), the response stays clean too.
 *
 * Returns `null` for any non-duplicate-key error so the caller falls
 * through to normal handling.
 */
function describeDuplicateKeyError(err) {
  if (!err || err.code !== 11000) return null;

  const keyValue = err.keyValue || {};
  const fields = Object.keys(keyValue);
  const label = fields.length ? (DUPLICATE_KEY_FIELD_LABELS[fields[0]] || fields[0]) : null;

  return {
    statusCode: 409,
    message: label
      ? `That ${label} is already in use on another account.`
      : 'That value is already in use on another account.',
  };
}

// Handle general server errors
const errorHandler = (err, req, res, next) => {
  const duplicateKey = describeDuplicateKeyError(err);
  const statusCode = duplicateKey
    ? duplicateKey.statusCode
    : res.statusCode === 200 ? 500 : res.statusCode;
  const requestLogger = getLogger(req);

  if (!err._alreadyLogged) {
    const logPayload = {
      requestId: req.requestId,
      statusCode,
      method: req.method,
      path: req.originalUrl || req.url,
      errorName: err.name,
      errorCode: err.code,
      err,
    };

    if (statusCode >= 500) {
      requestLogger.error(logPayload, 'http.error_handler');
    } else {
      requestLogger.warn(logPayload, 'http.error_handler');
    }
    err._alreadyLogged = true;
  }

  res.status(statusCode);
  res.json({
    message: duplicateKey ? duplicateKey.message : err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
