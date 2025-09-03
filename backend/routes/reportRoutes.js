// backend/routes/reportRoutes.js
const express = require('express');
const router = express.Router();

const { submitReport, getReports } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');
const upload = require('../middleware/uploadMiddleware'); // <<-- added

// Submit a report (any authenticated reader/admin can report)
// accept up to 5 files under field name 'evidence'
router.post('/', protect, upload.array('evidence', 5), submitReport);

// Admin view of all reports (requires admin role)
router.get('/', protect, requireAdmin, getReports);

module.exports = router;
