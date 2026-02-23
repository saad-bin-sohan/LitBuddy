const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');
const { listSupportSubmissions, updateSupportSubmission } = require('../controllers/adminSupportController');

router.use(protect, requireAdmin);

router.get('/submissions', listSupportSubmissions);
router.patch('/submissions/:id', updateSupportSubmission);

module.exports = router;
