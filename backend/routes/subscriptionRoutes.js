// backend/routes/subscriptionRoutes.js

const express = require('express');
const router = express.Router();
const { getSubscription, upgradeSubscription, downgradeSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');

router.get('/', protect, getSubscription);
// Upgrade is admin-only until Stripe payment integration is implemented.
// To grant premium access, an admin must call this endpoint manually
// or use the admin panel. Self-service upgrade is intentionally disabled.
router.post('/upgrade', protect, requireAdmin, upgradeSubscription);
// Upgrade is admin-only until Stripe payment integration is implemented.
// To grant premium access, an admin must call this endpoint manually
// or use the admin panel. Self-service upgrade is intentionally disabled.
router.post('/downgrade', protect, requireAdmin, downgradeSubscription);

module.exports = router;
