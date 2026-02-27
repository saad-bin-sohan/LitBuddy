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

reviewSchema.index({ bookId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, bookId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
