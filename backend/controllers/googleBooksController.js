const googleBooksService = require('../services/googleBooksService');
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
    const results = await googleBooksService.searchBooks(query.trim(), parseInt(page));
    res.json(results);
  } catch (error) {
    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`Google Books search failed: ${error.message}`);
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
    if (error.message === 'Book not found') {
      res.status(404);
      throw new Error('Book not found on Google Books');
    }
    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`Failed to fetch book: ${error.message}`);
  }
});

// @desc    Get book details from Google Books by ISBN
// @route   GET /api/googlebooks/book/isbn/:isbn
// @access  Private
const getGoogleBookByIsbn = asyncHandler(async (req, res) => {
  const { isbn } = req.params;

  // Validate ISBN format
  const isbnRegex = /^(?:\d{10}|\d{13})$/;
  if (!isbnRegex.test(isbn)) {
    res.status(400);
    throw new Error('Invalid ISBN format. Please provide a 10 or 13 digit ISBN.');
  }

  try {
    // Search by ISBN using Google Books
    const results = await googleBooksService.searchBooks(`isbn:${isbn}`, 1);
    if (results.results && results.results.length > 0) {
      const book = await googleBooksService.getBookById(results.results[0].googleBooksId);
      res.json(book);
    } else {
      res.status(404);
      throw new Error('Book not found on Google Books');
    }
  } catch (error) {
    if (error.message === 'Book not found') {
      res.status(404);
      throw new Error('Book not found on Google Books');
    }
    if (res.statusCode === 200) {
      res.status(500);
    }
    throw new Error(`Failed to fetch book: ${error.message}`);
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

  let normalizedStatus;
  try {
    normalizedStatus = normalizeReadingStatus(status, { defaultStatus: 'want-to-read' });
  } catch (error) {
    res.status(error.statusCode || 400);
    throw error;
  }

  try {
    // Get book details from Google Books
    const googleBook = await googleBooksService.getBookById(googleBooksId);

    // Check if book already exists in user's library
    const existingBook = await Book.findOne({
      googleBooksId: googleBook.googleBooksId,
      createdBy: req.user.id
    });

    if (existingBook) {
      res.status(400);
      throw new Error('Book already exists in your library');
    }

    // Create book in user's library
    const book = await Book.create({
      title: googleBook.title,
      author: googleBook.author,
      isbn: normalizeIsbn(googleBook.isbn),
      coverImage: googleBook.imageUrl,
      description: googleBook.description,
      genre: googleBook.categories || [],
      publishedYear: googleBook.publicationYear,
      pageCount: toNonNegativePageCount(googleBook.pages || totalPages),
      language: googleBook.language || 'English',
      googleBooksId: googleBook.googleBooksId,
      googleBooksRating: googleBook.averageRating,
      googleBooksRatingsCount: googleBook.ratingsCount,
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
      importedFrom: 'Google Books'
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
  searchGoogleBooks,
  getGoogleBookById,
  getGoogleBookByIsbn,
  importBookFromGoogleBooks
};
