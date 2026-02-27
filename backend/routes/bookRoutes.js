const express = require('express');
const router = express.Router();
const {
  createBook,
  searchBooks,
  getBookById,
  updateBook,
  updateBookVisibility,
  deleteBook,
  getMyBooks
} = require('../controllers/bookController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// Book management routes
router.route('/')
  .post(protect, createBook)
  .get(protect, getMyBooks);

router.route('/search')
  .get(protect, searchBooks);

router.route('/:id/visibility')
  .patch(protect, updateBookVisibility);

router.route('/:id')
  .get(optionalProtect, getBookById)
  .put(protect, updateBook)
  .delete(protect, deleteBook);

module.exports = router;
