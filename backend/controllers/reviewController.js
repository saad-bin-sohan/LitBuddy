const Review = require('../models/reviewModel');

// Add a new review
exports.addReview = async (req, res) => {
  try {
    const { bookId, rating, reviewText, spoiler } = req.body;
    const userId = req.user.id; // Assuming user is authenticated

    const review = new Review({ userId, bookId, rating, reviewText, spoiler });
    await review.save();

    res.status(201).json({ message: 'Review added successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add review', error: error.message });
  }
};

// Get reviews for a book
const { isValidObjectId } = require('../utils/objectIdValidator');

exports.getReviewsByBook = async (req, res) => {
  try {
    const { bookId } = req.params;

    if (!isValidObjectId(bookId)) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    const reviews = await Review.find({ bookId }).populate('userId', 'name');

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};

// Get reviews by a user
exports.getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.find({ userId }).populate('bookId', 'title');

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};

// Edit a review
exports.editReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, reviewText, spoiler } = req.body;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { rating, reviewText, spoiler, updatedAt: Date.now() },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ message: 'Review updated successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update review', error: error.message });
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findByIdAndDelete(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete review', error: error.message });
  }
};
