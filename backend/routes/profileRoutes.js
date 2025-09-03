// backend/routes/profileRoutes.js
const express = require('express');
const router = express.Router();

const {
  getMyProfile,
  updateUserProfile,
  getPublicProfile,
} = require('../controllers/profileController');

const { protect } = require('../middleware/authMiddleware');

// Private: get logged-in user's profile (merged with CityIndex)
router.get('/me', protect, getMyProfile);

// Private: update logged-in user's profile + location/city index
router.put('/', protect, updateUserProfile);

// Public: get public profile
router.get('/:userId', getPublicProfile);

module.exports = router;
