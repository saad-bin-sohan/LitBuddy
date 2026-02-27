const asyncHandler = require('express-async-handler');
const Review = require('../models/reviewModel');
const Book = require('../models/bookModel');
const { isValidObjectId } = require('../utils/objectIdValidator');

const isAdminUser = (user) => Boolean(user && (user.isAdmin || user.role === 'admin'));

const assertValidObjectId = (value, label, res) => {
  if (!isValidObjectId(value)) {
    res.status(400);
    throw new Error(`Invalid ${label} ID`);
  }
};

const assertReviewOwnerOrAdmin = (review, req, res) => {
  const isOwner = review.userId.toString() === req.user.id;
  if (!isOwner && !isAdminUser(req.user)) {
    res.status(403);
    throw new Error('Not authorized to modify this review');
  }
};

// Add or update a review (single review per user/book)
exports.addReview = asyncHandler(async (req, res) => {
  const { bookId, rating, reviewText, spoiler } = req.body;
  const userId = req.user.id;

  assertValidObjectId(bookId, 'book', res);

  const book = await Book.findOne({ _id: bookId, createdBy: userId });
  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  const review = await Review.findOneAndUpdate(
    { userId, bookId },
    {
      $set: {
        rating,
        reviewText,
        spoiler: Boolean(spoiler),
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(201).json({ message: 'Review saved successfully', review });
});

// Get reviews for a book
exports.getReviewsByBook = asyncHandler(async (req, res) => {
  const { bookId } = req.params;
  assertValidObjectId(bookId, 'book', res);

  const reviews = await Review.find({ bookId }).populate('userId', 'name').sort({ updatedAt: -1 });
  res.status(200).json(reviews);
});

// Get reviews by a user
exports.getReviewsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  assertValidObjectId(userId, 'user', res);

  const reviews = await Review.find({ userId }).populate('bookId', 'title').sort({ updatedAt: -1 });
  res.status(200).json(reviews);
});

// Edit a review
exports.editReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, reviewText, spoiler } = req.body;

  assertValidObjectId(reviewId, 'review', res);

  const review = await Review.findById(reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  assertReviewOwnerOrAdmin(review, req, res);

  if (Object.prototype.hasOwnProperty.call(req.body, 'rating')) {
    review.rating = rating;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'reviewText')) {
    review.reviewText = reviewText;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'spoiler')) {
    review.spoiler = Boolean(spoiler);
  }

  await review.save();

  res.status(200).json({ message: 'Review updated successfully', review });
});

// Delete a review
exports.deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  assertValidObjectId(reviewId, 'review', res);

  const review = await Review.findById(reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  assertReviewOwnerOrAdmin(review, req, res);

  await review.deleteOne();
  res.status(200).json({ message: 'Review deleted successfully' });
});

exports._private = {
  isAdminUser,
};
