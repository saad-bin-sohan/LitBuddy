const express = require('express');
const router = express.Router();
const { submitContact, submitFeedback } = require('../controllers/supportController');
const { supportSubmitLimiter } = require('../middleware/rateLimiter');

router.post('/contact', supportSubmitLimiter, submitContact);
router.post('/feedback', supportSubmitLimiter, submitFeedback);

module.exports = router;
