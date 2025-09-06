const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// Add a review
router.post('/', authMiddleware.protect, reviewController.addReview);

// Get reviews for a book
router.get('/book/:bookId', reviewController.getReviewsByBook);

// Get reviews by a user
router.get('/user/:userId', reviewController.getReviewsByUser);

// Edit a review
router.put('/:reviewId', authMiddleware.protect, reviewController.editReview);

// Delete a review
router.delete('/:reviewId', authMiddleware.protect, reviewController.deleteReview);

module.exports = router;
