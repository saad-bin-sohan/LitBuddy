const test = require('node:test');
const assert = require('node:assert/strict');

const googleBooksController = require('../controllers/googleBooksController');
const googleBooksService = require('../services/googleBooksService');
const Book = require('../models/bookModel');
const ReadingProgress = require('../models/readingProgressModel');

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

test('google books import normalizes legacy reading status', async () => {
  const originalGetBookById = googleBooksService.getBookById;
  const originalFindOne = Book.findOne;
  const originalCreateBook = Book.create;
  const originalCreateProgress = ReadingProgress.create;

  let capturedProgressStatus = null;

  try {
    googleBooksService.getBookById = async () => ({
      googleBooksId: 'gid-1',
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '978-0-441-17271-9',
      imageUrl: '',
      description: '',
      categories: ['Science Fiction'],
      publicationYear: 1965,
      pages: 412,
      language: 'en',
      averageRating: 4.5,
      ratingsCount: 1000,
    });
    Book.findOne = async () => null;
    Book.create = async () => ({
      _id: 'book-1',
      pageCount: 412,
    });
    ReadingProgress.create = async (payload) => {
      capturedProgressStatus = payload.status;
      return payload;
    };

    const { res, nextError } = await runController(googleBooksController.importBookFromGoogleBooks, {
      body: { googleBooksId: 'gid-1', status: 'reading' },
      user: { id: 'user-1' },
    });

    assert.equal(nextError, null);
    assert.equal(res.statusCode, 201);
    assert.equal(capturedProgressStatus, 'currently-reading');
  } finally {
    googleBooksService.getBookById = originalGetBookById;
    Book.findOne = originalFindOne;
    Book.create = originalCreateBook;
    ReadingProgress.create = originalCreateProgress;
  }
});
