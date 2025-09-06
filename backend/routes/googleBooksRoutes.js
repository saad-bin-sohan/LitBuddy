const express = require('express');
const router = express.Router();
const {
  searchGoogleBooks,
  getGoogleBookById,
  getGoogleBookByIsbn,
  importBookFromGoogleBooks
} = require('../controllers/googleBooksController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Google Books search and book information
router.route('/search')
  .get(searchGoogleBooks);

router.route('/book/:id')
  .get(getGoogleBookById);

router.route('/book/isbn/:isbn')
  .get(getGoogleBookByIsbn);

// Import book from Google Books
router.route('/import')
  .post(importBookFromGoogleBooks);

module.exports = router;
