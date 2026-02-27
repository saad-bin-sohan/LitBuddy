const Book = require('../models/bookModel');
const ReadingProgress = require('../models/readingProgressModel');
const asyncHandler = require('express-async-handler');
const { isValidObjectId } = require('../utils/objectIdValidator');

const MAX_BOOK_SEARCH_LIMIT = 100;
const DEFAULT_BOOK_SEARCH_LIMIT = 20;
const MUTABLE_BOOK_FIELDS = [
  'title',
  'author',
  'isbn',
  'coverImage',
  'description',
  'genre',
  'publishedYear',
  'pageCount',
  'language',
  'isCustom',
  'goodreadsId',
  'goodreadsRating',
  'goodreadsRatingsCount',
  'googleBooksId',
  'googleBooksRating',
  'googleBooksRatingsCount',
];

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseSearchLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_BOOK_SEARCH_LIMIT;
  if (parsed < 1) return 1;
  return Math.min(parsed, MAX_BOOK_SEARCH_LIMIT);
};

const normalizeBookPayload = (input = {}) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    payload.title = String(input.title || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'author')) {
    payload.author = String(input.author || '').trim();
  }
  if (Object.prototype.hasOwnProperty.call(input, 'isbn')) {
    payload.isbn = input.isbn;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'coverImage')) {
    payload.coverImage = input.coverImage || '';
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    payload.description = input.description || '';
  }
  if (Object.prototype.hasOwnProperty.call(input, 'genre')) {
    payload.genre = Array.isArray(input.genre) ? input.genre : [];
  }
  if (Object.prototype.hasOwnProperty.call(input, 'publishedYear')) {
    payload.publishedYear = input.publishedYear;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'pageCount')) {
    payload.pageCount = input.pageCount;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'language')) {
    payload.language = input.language || 'English';
  }
  if (Object.prototype.hasOwnProperty.call(input, 'isCustom')) {
    payload.isCustom = input.isCustom;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'goodreadsId')) {
    payload.goodreadsId = input.goodreadsId;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'goodreadsRating')) {
    payload.goodreadsRating = input.goodreadsRating;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'goodreadsRatingsCount')) {
    payload.goodreadsRatingsCount = input.goodreadsRatingsCount;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'googleBooksId')) {
    payload.googleBooksId = input.googleBooksId;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'googleBooksRating')) {
    payload.googleBooksRating = input.googleBooksRating;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'googleBooksRatingsCount')) {
    payload.googleBooksRatingsCount = input.googleBooksRatingsCount;
  }

  return payload;
};

// @desc    Create a new book
// @route   POST /api/books
// @access  Private
const createBook = asyncHandler(async (req, res) => {
  const payload = normalizeBookPayload(req.body);
  const title = String(payload.title || '').trim();
  const author = String(payload.author || '').trim();

  if (!title || !author) {
    res.status(400);
    throw new Error('Book title and author are required');
  }

  // Check if book already exists for this user
  const existingBook = await Book.findOne({
    title: { $regex: new RegExp(`^${escapeRegex(title)}$`, 'i') },
    author: { $regex: new RegExp(`^${escapeRegex(author)}$`, 'i') },
    createdBy: req.user.id
  });

  if (existingBook) {
    res.status(400);
    throw new Error('Book already exists in your library');
  }

  const book = await Book.create({ ...payload, title, author, createdBy: req.user.id });

  res.status(201).json(book);
});

// @desc    Search books
// @route   GET /api/books/search
// @access  Private
const searchBooks = asyncHandler(async (req, res) => {
  const { query, author, genre, limit = 20 } = req.query;

  const searchCriteria = { createdBy: req.user.id };

  if (query) {
    const safeQuery = escapeRegex(query);
    searchCriteria.$or = [
      { title: { $regex: safeQuery, $options: 'i' } },
      { author: { $regex: safeQuery, $options: 'i' } }
    ];
  }

  if (author) {
    searchCriteria.author = { $regex: escapeRegex(author), $options: 'i' };
  }

  if (genre) {
    searchCriteria.genre = { $in: [genre] };
  }

  const books = await Book.find(searchCriteria)
    .limit(parseSearchLimit(limit))
    .sort({ title: 1 });

  res.json(books);
});

const getBookById = asyncHandler(async (req, res) => {
  const bookId = req.params.id;

  if (!isValidObjectId(bookId)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  const book = await Book.findOne({ _id: bookId, createdBy: req.user.id });

  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  res.json(book);
});

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private
const updateBook = asyncHandler(async (req, res) => {
  const bookId = req.params.id;

  if (!isValidObjectId(bookId)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  const book = await Book.findOne({ _id: bookId, createdBy: req.user.id });

  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  const updates = {};
  for (const key of MUTABLE_BOOK_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      updates[key] = req.body[key];
    }
  }

  const normalizedUpdates = normalizeBookPayload(updates);
  Object.assign(book, normalizedUpdates);
  const updatedBook = await book.save();

  res.json(updatedBook);
});

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private
const deleteBook = asyncHandler(async (req, res) => {
  const bookId = req.params.id;

  if (!isValidObjectId(bookId)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  const book = await Book.findOne({ _id: bookId, createdBy: req.user.id });

  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  // Check if book is being used in reading progress
  const readingProgress = await ReadingProgress.findOne({ book: bookId });
  if (readingProgress) {
    res.status(400);
    throw new Error('Cannot delete book that is being tracked in reading progress');
  }

  await book.deleteOne();

  res.json({ message: 'Book removed' });
});

// @desc    Get user's books
// @route   GET /api/books/my-books
// @access  Private
const getMyBooks = asyncHandler(async (req, res) => {
  const books = await Book.find({ createdBy: req.user.id })
    .sort({ createdAt: -1 });

  res.json(books);
});

module.exports = {
  createBook,
  searchBooks,
  getBookById,
  updateBook,
  deleteBook,
  getMyBooks
};
