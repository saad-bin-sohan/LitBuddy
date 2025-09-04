const express = require('express');
const router = express.Router();
const {
  searchGoodreadsBooks,
  getGoodreadsBookById,
  getGoodreadsBookByIsbn,
  getGoodreadsAuthor,
  importBookFromGoodreads
} = require('../controllers/goodreadsController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// GoodReads search and book information
router.route('/search')
  .get(searchGoodreadsBooks);

router.route('/book/:id')
  .get(getGoodreadsBookById);

router.route('/book/isbn/:isbn')
  .get(getGoodreadsBookByIsbn);

router.route('/author/:id')
  .get(getGoodreadsAuthor);

// Import book from GoodReads
router.route('/import')
  .post(importBookFromGoodreads);

module.exports = router;
