const Review = require('../models/reviewModel');
const { getLogger } = require('../utils/logger');
const { isValidObjectId } = require('../utils/objectIdValidator');

function canManageReview(review, user) {
  if (!review || !user) return false;
  const isOwner = String(review.userId) === String(user._id || user.id);
  const isAdmin = !!(user.isAdmin || user.role === 'admin');
  return isOwner || isAdmin;
}

// Add a new review revision
exports.addReview = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const { bookId, rating, reviewText, spoiler } = req.body;
    const userId = req.user.id;

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    const review = await Review.create({ userId, bookId, rating, reviewText, spoiler });
    res.status(201).json({ message: 'Review added successfully', review });
  } catch (error) {
    requestLogger.error(
      {
        err: error,
        userId: req.user && (req.user.id || req.user._id),
      },
      'review.add_failed'
    );
    res.status(500).json({ message: 'Failed to add review', error: error.message });
  }
};

// Get reviews for a book
exports.getReviewsByBook = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const { bookId } = req.params;
    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    const reviews = await Review.find({ bookId })
      .populate('userId', 'name displayName')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    requestLogger.error(
      {
        err: error,
        bookId: req.params.bookId,
      },
      'review.get_by_book_failed'
    );
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};

// Get reviews by a user
exports.getReviewsByUser = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const reviews = await Review.find({ userId })
      .populate('bookId', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    requestLogger.error(
      {
        err: error,
        userId: req.params.userId,
      },
      'review.get_by_user_failed'
    );
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};

// Edit a review
exports.editReview = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const { reviewId } = req.params;
    const { rating, reviewText, spoiler } = req.body;

    if (!isValidObjectId(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (!canManageReview(review, req.user)) {
      return res.status(403).json({ message: 'Not authorized to edit this review' });
    }

    if (rating !== undefined) review.rating = rating;
    if (reviewText !== undefined) review.reviewText = reviewText;
    if (spoiler !== undefined) review.spoiler = spoiler;

    await review.save();
    res.status(200).json({ message: 'Review updated successfully', review });
  } catch (error) {
    requestLogger.error(
      {
        err: error,
        reviewId: req.params.reviewId,
      },
      'review.edit_failed'
    );
    res.status(500).json({ message: 'Failed to update review', error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    const { reviewId } = req.params;
    if (!isValidObjectId(reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (!canManageReview(review, req.user)) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();
    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    requestLogger.error(
      {
        err: error,
        reviewId: req.params.reviewId,
      },
      'review.delete_failed'
    );
    res.status(500).json({ message: 'Failed to delete review', error: error.message });
  }
};
