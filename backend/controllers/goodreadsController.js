const asyncHandler = require('express-async-handler');
const goodreadsService = require('../services/goodreadsService');
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

// @desc    Search books on GoodReads
// @route   GET /api/goodreads/search
// @access  Private
const searchGoodreadsBooks = asyncHandler(async (req, res) => {
  const { query, page = 1 } = req.query;
  if (!query || query.trim().length < 2) {
    res.status(400);
    throw new Error('Search query must be at least 2 characters long');
  }

  try {
    const results = await goodreadsService.searchBooks(query.trim(), Number.parseInt(page, 10) || 1);
    res.json(results);
  } catch (error) {
    res.status(502);
    throw new Error(error.message || 'GoodReads search failed');
  }
});

// @desc    Get book details from GoodReads by ID
// @route   GET /api/goodreads/book/:id
// @access  Private
const getGoodreadsBookById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const book = await goodreadsService.getBookById(id);
    res.json(book);
  } catch (error) {
    res.status(502);
    throw new Error(error.message || 'Failed to fetch book');
  }
});

// @desc    Get book details from GoodReads by ISBN
// @route   GET /api/goodreads/book/isbn/:isbn
// @access  Private
const getGoodreadsBookByIsbn = asyncHandler(async (req, res) => {
  const { isbn } = req.params;
  const isbnRegex = /^(?:\d{10}|\d{13})$/;
  if (!isbnRegex.test(isbn)) {
    res.status(400);
    throw new Error('Invalid ISBN format. Please provide a 10 or 13 digit ISBN.');
  }

  try {
    const book = await goodreadsService.getBookByIsbn(isbn);
    res.json(book);
  } catch (error) {
    res.status(502);
    throw new Error(error.message || 'Failed to fetch book by ISBN');
  }
});

// @desc    Get author information from GoodReads
// @route   GET /api/goodreads/author/:id
// @access  Private
const getGoodreadsAuthor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const author = await goodreadsService.getAuthorInfo(id);
    res.json(author);
  } catch (error) {
    res.status(502);
    throw new Error(error.message || 'Failed to fetch author');
  }
});

// @desc    Import book from GoodReads to user's library
// @route   POST /api/goodreads/import
// @access  Private
const importBookFromGoodreads = asyncHandler(async (req, res) => {
  const { goodreadsId, status = 'want-to-read', totalPages } = req.body;

  if (!goodreadsId) {
    res.status(400);
    throw new Error('GoodReads book ID is required');
  }

  try {
    const normalizedStatus = normalizeImportStatus(status);
    const goodreadsBook = await goodreadsService.getBookById(goodreadsId);

    const { book, created, reused } = await upsertCanonicalBookFromExternal({
      source: 'goodreads',
      externalBook: goodreadsBook,
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
      importedFrom: 'GoodReads',
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
  searchGoodreadsBooks,
  getGoodreadsBookById,
  getGoodreadsBookByIsbn,
  getGoodreadsAuthor,
  importBookFromGoodreads,
};
