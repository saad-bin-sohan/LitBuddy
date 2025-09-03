// backend/routes/subscriptionRoutes.js

const express = require('express');
const router = express.Router();
const { getSubscription, upgradeSubscription, downgradeSubscription } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSubscription);
router.post('/upgrade', protect, upgradeSubscription);
router.post('/downgrade', protect, downgradeSubscription);

module.exports = router;
