const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const reviewController = require('../controllers/reviewController');
const Review = require('../models/reviewModel');
const Book = require('../models/bookModel');

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function runController(handler, req) {
  const res = createMockResponse();
  let nextError = null;
  await handler(req, res, (err) => {
    nextError = err || null;
  });
  return { res, nextError };
}

test('addReview upserts single review per user/book', async () => {
  const originalBookFindOne = Book.findOne;
  const originalReviewFindOneAndUpdate = Review.findOneAndUpdate;
  const userId = new mongoose.Types.ObjectId().toString();
  const bookId = new mongoose.Types.ObjectId().toString();

  let capturedFilter = null;
  let capturedUpdate = null;

  try {
    Book.findOne = async () => ({ _id: bookId, createdBy: userId });
    Review.findOneAndUpdate = async (filter, update) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { _id: 'review-1', userId, bookId, rating: 5, reviewText: 'Great book', spoiler: false };
    };

    const { res, nextError } = await runController(reviewController.addReview, {
      body: { bookId, rating: 5, reviewText: 'Great book', spoiler: false },
      user: { id: userId },
    });

    assert.equal(nextError, null);
    assert.equal(res.statusCode, 201);
    assert.equal(capturedFilter.userId, userId);
    assert.equal(capturedFilter.bookId, bookId);
    assert.equal(capturedUpdate.$set.rating, 5);
  } finally {
    Book.findOne = originalBookFindOne;
    Review.findOneAndUpdate = originalReviewFindOneAndUpdate;
  }
});

test('editReview blocks non-owner non-admin users with 403', async () => {
  const originalFindById = Review.findById;
  const ownerId = new mongoose.Types.ObjectId().toString();
  const actorId = new mongoose.Types.ObjectId().toString();
  const reviewId = new mongoose.Types.ObjectId().toString();

  try {
    Review.findById = async () => ({
      _id: reviewId,
      userId: new mongoose.Types.ObjectId(ownerId),
      save: async () => {},
    });

    const { res, nextError } = await runController(reviewController.editReview, {
      params: { reviewId },
      body: { reviewText: 'Updated' },
      user: { id: actorId, role: 'reader', isAdmin: false },
    });

    assert.ok(nextError);
    assert.equal(res.statusCode, 403);
    assert.equal(nextError.message, 'Not authorized to modify this review');
  } finally {
    Review.findById = originalFindById;
  }
});

test('deleteReview allows owner to delete review', async () => {
  const originalFindById = Review.findById;
  const ownerId = new mongoose.Types.ObjectId().toString();
  const reviewId = new mongoose.Types.ObjectId().toString();
  let deleted = false;

  try {
    Review.findById = async () => ({
      _id: reviewId,
      userId: new mongoose.Types.ObjectId(ownerId),
      deleteOne: async () => {
        deleted = true;
      },
    });

    const { res, nextError } = await runController(reviewController.deleteReview, {
      params: { reviewId },
      user: { id: ownerId, role: 'reader', isAdmin: false },
    });

    assert.equal(nextError, null);
    assert.equal(res.statusCode, 200);
    assert.equal(deleted, true);
  } finally {
    Review.findById = originalFindById;
  }
});
