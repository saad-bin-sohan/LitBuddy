const express = require('express');
const router = express.Router();
const {
  addBookToList,
  updateProgress,
  getReadingLists,
  removeFromList,
  getReadingStats
} = require('../controllers/readingProgressController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Reading progress routes
router.route('/')
  .post(addBookToList);

router.route('/lists')
  .get(getReadingLists);

router.route('/stats')
  .get(getReadingStats);

router.route('/:id')
  .put(updateProgress)
  .delete(removeFromList);

module.exports = router;
