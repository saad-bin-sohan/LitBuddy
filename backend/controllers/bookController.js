const Book = require('../models/bookModel');
const ReadingProgress = require('../models/readingProgressModel');
const asyncHandler = require('express-async-handler');

// @desc    Create a new book
// @route   POST /api/books
// @access  Private
const createBook = asyncHandler(async (req, res) => {
  const { title, author, isbn, coverImage, description, genre, publishedYear, pageCount, language } = req.body;

  // Check if book already exists for this user
  const existingBook = await Book.findOne({
    title: { $regex: new RegExp(`^${title}$`, 'i') },
    author: { $regex: new RegExp(`^${author}$`, 'i') },
    createdBy: req.user.id
  });

  if (existingBook) {
    res.status(400);
    throw new Error('Book already exists in your library');
  }

  const book = await Book.create({
    title,
    author,
    isbn,
    coverImage,
    description,
    genre: genre || [],
    publishedYear,
    pageCount,
    language: language || 'English',
    createdBy: req.user.id
  });

  res.status(201).json(book);
});

// @desc    Search books
// @route   GET /api/books/search
// @access  Private
const searchBooks = asyncHandler(async (req, res) => {
  const { query, author, genre, limit = 20 } = req.query;

  let searchCriteria = {};

  if (query) {
    searchCriteria.$or = [
      { title: { $regex: query, $options: 'i' } },
      { author: { $regex: query, $options: 'i' } }
    ];
  }

  if (author) {
    searchCriteria.author = { $regex: author, $options: 'i' };
  }

  if (genre) {
    searchCriteria.genre = { $in: [genre] };
  }

  const books = await Book.find(searchCriteria)
    .limit(parseInt(limit))
    .sort({ title: 1 });

  res.json(books);
});

// @desc    Get book by ID
// @route   GET /api/books/:id
// @access  Private
const { isValidObjectId } = require('../utils/objectIdValidator');

const getBookById = asyncHandler(async (req, res) => {
  const bookId = req.params.id;

  if (!isValidObjectId(bookId)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  const book = await Book.findById(bookId);

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
  const book = await Book.findById(req.params.id);

  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  // Check if user owns the book
  if (book.createdBy.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to update this book');
  }

  const updatedBook = await Book.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json(updatedBook);
});

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private
const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);

  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  // Check if user owns the book
  if (book.createdBy.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to delete this book');
  }

  // Check if book is being used in reading progress
  const readingProgress = await ReadingProgress.findOne({ book: req.params.id });
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
