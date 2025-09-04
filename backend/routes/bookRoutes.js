const express = require('express');
const router = express.Router();
const {
  createBook,
  searchBooks,
  getBookById,
  updateBook,
  deleteBook,
  getMyBooks
} = require('../controllers/bookController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Book management routes
router.route('/')
  .post(createBook)
  .get(getMyBooks);

router.route('/search')
  .get(searchBooks);

router.route('/:id')
  .get(getBookById)
  .put(updateBook)
  .delete(deleteBook);

module.exports = router;
