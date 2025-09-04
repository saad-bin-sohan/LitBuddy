const express = require('express');
const router = express.Router();
const {
  setReadingGoals,
  getReadingGoals,
  getAchievements,
  updateProgress
} = require('../controllers/readingGoalController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Reading goal routes
router.route('/')
  .post(setReadingGoals)
  .get(getReadingGoals);

router.route('/achievements')
  .get(getAchievements);

router.route('/progress')
  .put(updateProgress);

module.exports = router;
