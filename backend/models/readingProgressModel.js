const mongoose = require('mongoose');

const readingProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    status: {
      type: String,
      enum: ['want-to-read', 'currently-reading', 'completed', 'dnf'], // dnf = did not finish
      required: true
    },
    currentPage: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPages: {
      type: Number,
      required: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    finishDate: {
      type: Date
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    review: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    readingTime: {
      type: Number, // in minutes
      default: 0
    },
    // For tracking reading sessions
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Compound index to ensure one progress entry per user per book
readingProgressSchema.index({ user: 1, book: 1 }, { unique: true });

// Indexes for efficient queries
readingProgressSchema.index({ user: 1, status: 1 });
readingProgressSchema.index({ user: 1, finishDate: 1 });
readingProgressSchema.index({ book: 1, status: 1 });

module.exports = mongoose.model('ReadingProgress', readingProgressSchema);
