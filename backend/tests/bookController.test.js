const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const bookController = require('../controllers/bookController');
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

test('searchBooks enforces createdBy scope in query criteria', async () => {
  const originalFind = Book.find;
  const userId = new mongoose.Types.ObjectId().toString();
  let capturedQuery = null;
  let capturedLimit = null;

  try {
    Book.find = (query) => {
      capturedQuery = query;
      return {
        limit(limitValue) {
          capturedLimit = limitValue;
          return this;
        },
        sort() {
          return Promise.resolve([]);
        },
      };
    };

    const { res, nextError } = await runController(bookController.searchBooks, {
      query: { query: 'dune', limit: '999' },
      user: { id: userId },
    });

    assert.equal(nextError, null);
    assert.equal(res.statusCode, 200);
    assert.equal(capturedQuery.createdBy, userId);
    assert.equal(capturedLimit, 100);
  } finally {
    Book.find = originalFind;
  }
});

test('getBookById enforces createdBy scope', async () => {
  const originalFindOne = Book.findOne;
  const userId = new mongoose.Types.ObjectId().toString();
  const bookId = new mongoose.Types.ObjectId().toString();
  let capturedQuery = null;

  try {
    Book.findOne = async (query) => {
      capturedQuery = query;
      return { _id: bookId, createdBy: userId, title: 'Scoped Book' };
    };

    const { res, nextError } = await runController(bookController.getBookById, {
      params: { id: bookId },
      user: { id: userId },
    });

    assert.equal(nextError, null);
    assert.equal(res.statusCode, 200);
    assert.equal(capturedQuery._id, bookId);
    assert.equal(capturedQuery.createdBy, userId);
  } finally {
    Book.findOne = originalFindOne;
  }
});
