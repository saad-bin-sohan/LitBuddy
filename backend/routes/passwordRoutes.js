// backend/routes/passwordRoutes.js
const express = require('express');
const router = express.Router();
const { requestPasswordReset, resetPassword } = require('../controllers/passwordController');

// Request reset (sends email if account exists)
router.post('/request', requestPasswordReset);

// Reset using token
router.post('/reset', resetPassword);

module.exports = router;
