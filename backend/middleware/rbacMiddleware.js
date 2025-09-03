// backend/middleware/rbacMiddleware.js
/**
 * RBAC middleware for LitBuddy
 *
 * Provides:
 *  - requireRole(role)  -> middleware factory to require an arbitrary role (e.g. 'admin', 'reader')
 *  - requireAdmin       -> shortcut middleware for admin-only routes
 *
 * Backwards-compatibility:
 *  - Many existing parts of the codebase use `user.isAdmin` boolean.
 *    This middleware will honor both `user.isAdmin` and `user.role === 'admin'`.
 *
 * Usage:
 *  const { requireAdmin } = require('../middleware/rbacMiddleware');
 *  router.use(protect, requireAdmin);
 */

const asyncHandler = require('express-async-handler');

function _hasAdminFlag(user) {
  // Accept multiple field names for compatibility: `isAdmin` OR `role === 'admin'`
  if (!user) return false;
  if (typeof user.isAdmin !== 'undefined') {
    return !!user.isAdmin;
  }
  if (typeof user.role === 'string') {
    return user.role === 'admin';
  }
  return false;
}

/**
 * Check whether a user "has" the requested role.
 * - 'admin' checks isAdmin OR role === 'admin'
 * - 'reader' returns true for non-admin users (backwards-compatible)
 * - For any other role, checks user.role === role if present
 */
function userHasRole(user, role) {
  if (!user) return false;

  if (role === 'admin') {
    return _hasAdminFlag(user);
  }

  // If user.role exists, use it
  if (typeof user.role === 'string') {
    return user.role === role;
  }

  // Fallback: treat non-admins as 'reader'
  if (role === 'reader') {
    return !_hasAdminFlag(user);
  }

  return false;
}

/**
 * requireRole(role)
 * Middleware factory that ensures req.user exists and has the given role.
 *
 * Accepts a string role (e.g. 'admin' or 'reader').
 */
function requireRole(role) {
  if (!role || typeof role !== 'string') {
    throw new Error('requireRole: role must be a non-empty string');
  }

  return asyncHandler(async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      if (!userHasRole(req.user, role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // all good
      return next();
    } catch (err) {
      // let error middleware handle it
      next(err);
    }
  });
}

/**
 * requireAdmin
 * Convenience middleware for admin-only routes.
 */
const requireAdmin = requireRole('admin');

module.exports = {
  requireRole,
  requireAdmin,
};
