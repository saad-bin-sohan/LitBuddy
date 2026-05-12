// backend/routes/fileRoutes.js
//
// Mounts at /uploads in server.js.
// Replaces the public express.static mount.
// The protect middleware rejects unauthenticated requests with 401 before
// the file controller is reached.

const express = require('express');
const router = express.Router();
const { serveFile } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

// GET /uploads/:filename -- authenticated file serving
router.get('/:filename', protect, serveFile);

module.exports = router;
