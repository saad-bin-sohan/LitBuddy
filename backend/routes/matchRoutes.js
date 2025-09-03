// backend/routes/matchRoutes.js

const express = require('express');
const router = express.Router();
const {
    getDailySuggestions,
    likeUser,
    getMatches,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

// Get daily partner suggestions
router.get('/suggestions', protect, getDailySuggestions);

// Like a user
router.post('/like/:id', protect, likeUser);

// Get all matches
router.get('/', protect, getMatches);

module.exports = router;
