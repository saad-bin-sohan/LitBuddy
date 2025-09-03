// backend/routes/adminRoutes.js
/**
 * Admin routes
 *
 * Mounted at /api/admin
 * All routes require authentication (protect) and admin permissions (requireAdmin).
 *
 * Sections:
 *  - /users/*      -> user management (list/get/promote/demote/suspend/unsuspend/verify/reset-reports)
 *  - /reports/*    -> moderation endpoints (list/get/update status/add note)
 */

const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

// adminController manages user-level admin actions
const {
  listUsers,
  getUser,
  promoteToAdmin,
  demoteFromAdmin,
  suspendUser,    // adminController.suspendUser
  unsuspendUser,  // adminController.unsuspendUser
  resetReports,
  verifyUser,
} = require('../controllers/adminController');

// moderationController manages report moderation flows
const {
  listReports,
  getReport,
  updateReportStatus,
  addModeratorNote,
  suspendUser: moderationSuspendUser,
  unsuspendUser: moderationUnsuspendUser,
} = require('../controllers/moderationController');

// All admin routes require both authentication and admin role
router.use(protect, requireAdmin);

/**
 * User management
 */
router.get('/users', listUsers);
router.get('/users/:id', getUser);

router.patch('/users/:id/promote', promoteToAdmin);
router.patch('/users/:id/demote', demoteFromAdmin);

// Suspension: adminController has suspend/unsuspend for user-level actions
router.patch('/users/:id/suspend', suspendUser);   // body: { days, until, reason }
router.patch('/users/:id/unsuspend', unsuspendUser);

// Moderation helpers on user (report counts / verification)
router.patch('/users/:id/reset-reports', resetReports);
router.patch('/users/:id/verify', verifyUser); // body: { verified: true }

 /**
  * Moderation: reports (separate logical grouping)
  * - GET    /api/admin/reports        -> list reports (paginated, filters)
  * - GET    /api/admin/reports/:id    -> get single report detail
  * - PATCH  /api/admin/reports/:id    -> update status + optional moderator action
  * - POST   /api/admin/reports/:id/notes -> add moderator note (body: { note })
  */
router.get('/reports', listReports);
router.get('/reports/:id', getReport);

// Update report status & optional moderator actions
// Body shape example:
// { status: 'reviewed', moderatorNote: 'Seen, no action', action: { suspendUser: { userId, days, reason } } }
router.patch('/reports/:id', updateReportStatus);

// Add a moderator note
router.post('/reports/:id/notes', addModeratorNote);

// Convenience moderator-level user suspend endpoints (if moderationController exposes them)
router.patch('/reports/:id/suspend-user', async (req, res, next) => {
  // wrapper that accepts body { userId, days, reason } and calls moderationSuspendUser
  try {
    const { userId, days, reason } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    // reuse moderation controller's suspendUser (expects req.params.id as user id)
    // create a fake req/res for the controller or call function directly — here we'll route to moderation controller's suspendUser via call:
    req.params.id = userId;
    req.body = { days, reason };
    return moderationSuspendUser(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Unsuspend user (via moderation controller)
router.patch('/reports/:id/unsuspend-user', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    req.params.id = userId;
    return moderationUnsuspendUser(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
