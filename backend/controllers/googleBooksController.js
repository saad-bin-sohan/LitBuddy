const asyncHandler = require('express-async-handler');
const googleBooksService = require('../services/googleBooksService');
const ReadingProgress = require('../models/readingProgressModel');
const { upsertCanonicalBookFromExternal } = require('../services/bookCatalogService');
const { sanitizeBookForUser } = require('../utils/bookAccess');

const VALID_PROGRESS_STATUSES = new Set(['want-to-read', 'currently-reading', 'completed', 'dnf']);

function normalizeImportStatus(value) {
  if (value === undefined || value === null || value === '') return null;
  const status = String(value).trim();
  if (!VALID_PROGRESS_STATUSES.has(status)) {
    const err = new Error('Invalid reading status');
    err.status = 400;
    throw err;
  }
  return status;
}

async function ensureReadingProgress({ userId, book, status, totalPages }) {
  if (!status) return null;

  const existing = await ReadingProgress.findOne({ user: userId, book: book._id });
  if (existing) return existing;

  return ReadingProgress.create({
    user: userId,
    book: book._id,
    status,
    totalPages: book.pageCount || totalPages || 1,
    startDate: new Date(),
    currentPage: status === 'currently-reading' ? 1 : 0,
    finishDate: status === 'completed' ? new Date() : undefined,
  });
}

// @desc    Search books on Google Books
// @route   GET /api/googlebooks/search
// @access  Private
const searchGoogleBooks = asyncHandler(async (req, res) => {
  const { query, page = 1 } = req.query;
  if (!query || query.trim().length < 2) {
    res.status(400);
    throw new Error('Search query must be at least 2 characters long');
  }

  try {
    const results = await googleBooksService.searchBooks(query.trim(), Number.parseInt(page, 10) || 1);
    res.json(results);
  } catch (error) {
    res.status(502);
    throw new Error(error.message || 'Google Books search failed');
  }
});

// @desc    Get book details from Google Books by ID
// @route   GET /api/googlebooks/book/:id
// @access  Private
const getGoogleBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const book = await googleBooksService.getBookById(id);
    res.json(book);
  } catch (error) {
    res.status(502);
    throw new Error(error.message || 'Failed to fetch book');
  }
});

// @desc    Get book details from Google Books by ISBN
// @route   GET /api/googlebooks/book/isbn/:isbn
// @access  Private
const getGoogleBookByIsbn = asyncHandler(async (req, res) => {
  const { isbn } = req.params;
  const isbnRegex = /^(?:\d{10}|\d{13})$/;
  if (!isbnRegex.test(isbn)) {
    res.status(400);
    throw new Error('Invalid ISBN format. Please provide a 10 or 13 digit ISBN.');
  }

  try {
    const results = await googleBooksService.searchBooks(`isbn:${isbn}`, 1);
    if (!results.results || results.results.length === 0) {
      res.status(404);
      throw new Error('Book not found on Google Books');
    }
    const book = await googleBooksService.getBookById(results.results[0].googleBooksId);
    res.json(book);
  } catch (error) {
    if (res.statusCode === 404) throw error;
    res.status(502);
    throw new Error(error.message || 'Failed to fetch book by ISBN');
  }
});

// @desc    Import book from Google Books to user's library
// @route   POST /api/googlebooks/import
// @access  Private
const importBookFromGoogleBooks = asyncHandler(async (req, res) => {
  const { googleBooksId, status = 'want-to-read', totalPages } = req.body;

  if (!googleBooksId) {
    res.status(400);
    throw new Error('Google Books volume ID is required');
  }

  try {
    const normalizedStatus = normalizeImportStatus(status);
    const googleBook = await googleBooksService.getBookById(googleBooksId);

    const { book, created, reused } = await upsertCanonicalBookFromExternal({
      source: 'googlebooks',
      externalBook: googleBook,
      userId: req.user.id,
    });

    const progress = await ensureReadingProgress({
      userId: req.user.id,
      book,
      status: normalizedStatus,
      totalPages,
    });

    res.status(created ? 201 : 200).json({
      message: created ? 'Book imported successfully' : 'Book linked from canonical catalog',
      importedFrom: 'Google Books',
      reused,
      book: sanitizeBookForUser(book, req.user),
      readingProgressId: progress ? progress._id : null,
    });
  } catch (error) {
    res.status(error.status || 502);
    throw new Error(error.message || 'Failed to import book');
  }
});

module.exports = {
  searchGoogleBooks,
  getGoogleBookById,
  getGoogleBookByIsbn,
  importBookFromGoogleBooks,
};
