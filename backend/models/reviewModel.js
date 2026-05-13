const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: { type: String, required: true, trim: true },
    spoiler: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fetching all reviews for a book, newest first
reviewSchema.index({ bookId: 1, createdAt: -1 });

// Compound index for fetching a user's reviews
reviewSchema.index({ userId: 1, createdAt: -1 });

// Unique constraint: one review per user per book.
// If a user tries to review the same book twice, MongoDB returns error code 11000.
// reviewController.addReview handles this with a 409 Conflict response.
reviewSchema.index({ userId: 1, bookId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
