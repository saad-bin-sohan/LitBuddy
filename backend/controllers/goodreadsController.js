const goodreadsService = require('../services/goodreadsService');
const asyncHandler = require('express-async-handler');
const Book = require('../models/bookModel');
const ReadingProgress = require('../models/readingProgressModel');
const { normalizeReadingStatus } = require('../utils/readingStatus');
const { normalizeIsbn } = require('../utils/isbn');

const toNonNegativePageCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

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
    const results = await goodreadsService.searchBooks(query.trim(), parseInt(page));
    res.json(results);
  } catch (error) {
    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`GoodReads search failed: ${error.message}`);
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
    if (error.message === 'Book not found') {
      res.status(404);
      throw new Error('Book not found on GoodReads');
    }
    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`Failed to fetch book: ${error.message}`);
  }
});

// @desc    Get book details from GoodReads by ISBN
// @route   GET /api/goodreads/book/isbn/:isbn
// @access  Private
const getGoodreadsBookByIsbn = asyncHandler(async (req, res) => {
  const { isbn } = req.params;

  // Validate ISBN format
  const isbnRegex = /^(?:\d{10}|\d{13})$/;
  if (!isbnRegex.test(isbn)) {
    res.status(400);
    throw new Error('Invalid ISBN format. Please provide a 10 or 13 digit ISBN.');
  }

  try {
    const book = await goodreadsService.getBookByIsbn(isbn);
    res.json(book);
  } catch (error) {
    if (error.message === 'Book not found') {
      res.status(404);
      throw new Error('Book not found on GoodReads');
    }
    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`Failed to fetch book: ${error.message}`);
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
    if (error.message === 'Author not found') {
      res.status(404);
      throw new Error('Author not found on GoodReads');
    }
    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`Failed to fetch author: ${error.message}`);
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

  let normalizedStatus;
  try {
    normalizedStatus = normalizeReadingStatus(status, { defaultStatus: 'want-to-read' });
  } catch (error) {
    res.status(error.statusCode || 400);
    throw error;
  }

  try {
    // Get book details from GoodReads
    const goodreadsBook = await goodreadsService.getBookById(goodreadsId);
    
    // Check if book already exists in user's library
    const existingBook = await Book.findOne({
      goodreadsId: goodreadsBook.goodreadsId,
      createdBy: req.user.id
    });

    if (existingBook) {
      res.status(400);
      throw new Error('Book already exists in your library');
    }

    // Create book in user's library
    const book = await Book.create({
      title: goodreadsBook.title,
      author: goodreadsBook.author,
      isbn: normalizeIsbn(goodreadsBook.isbn),
      coverImage: goodreadsBook.imageUrl,
      description: goodreadsBook.description,
      genre: goodreadsBook.genres || [],
      publishedYear: goodreadsBook.publicationYear,
      pageCount: toNonNegativePageCount(goodreadsBook.pages || totalPages),
      language: goodreadsBook.language || 'English',
      goodreadsId: goodreadsBook.goodreadsId,
      goodreadsRating: goodreadsBook.averageRating,
      goodreadsRatingsCount: goodreadsBook.ratingsCount,
      isCustom: false,
      createdBy: req.user.id
    });

    // Add to reading list if status is provided
    await ReadingProgress.create({
      user: req.user.id,
      book: book._id,
      status: normalizedStatus,
      totalPages: toNonNegativePageCount(book.pageCount ?? totalPages ?? 0),
      startDate: new Date()
    });

    res.status(201).json({
      message: 'Book imported successfully',
      book,
      importedFrom: 'GoodReads'
    });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
      throw error;
    }

    if (res.statusCode >= 400 && res.statusCode < 500) {
      throw error;
    }

    if (error.name === 'ValidationError' || error.code === 11000) {
      if (res.statusCode === 200) {
        res.status(400);
      }
      throw error;
    }

    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`Failed to import book: ${error.message}`);
  }
});

module.exports = {
  searchGoodreadsBooks,
  getGoodreadsBookById,
  getGoodreadsBookByIsbn,
  getGoodreadsAuthor,
  importBookFromGoodreads
};
