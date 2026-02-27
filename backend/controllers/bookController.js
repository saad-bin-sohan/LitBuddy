const asyncHandler = require('express-async-handler');
const Book = require('../models/bookModel');
const Review = require('../models/reviewModel');
const ReadingProgress = require('../models/readingProgressModel');
const { isValidObjectId } = require('../utils/objectIdValidator');
const { normalizeIsbn } = require('../utils/isbn');
const {
  canReadBook,
  isBookOwner,
  sanitizeBookForUser,
} = require('../utils/bookAccess');
const { findCanonicalByIsbnNormalized } = require('../services/bookCatalogService');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseGenre(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function getBookUpdatePayload(body = {}) {
  const payload = {};
  const allowed = [
    'title',
    'author',
    'isbn',
    'coverImage',
    'description',
    'publishedYear',
    'pageCount',
    'language',
    'isCustom',
  ];

  for (const key of allowed) {
    if (!(key in body)) continue;
    payload[key] = body[key];
  }

  if ('genre' in body) {
    payload.genre = parseGenre(body.genre);
  }

  if ('isbn' in payload) {
    payload.isbnNormalized = normalizeIsbn(payload.isbn);
  }

  return payload;
}

async function hydrateCanonicalWithUserInput(book, input) {
  if (!book || !input) return;

  const fields = [
    'title',
    'author',
    'coverImage',
    'description',
    'publishedYear',
    'pageCount',
    'language',
  ];

  for (const key of fields) {
    const incoming = input[key];
    if (incoming === undefined || incoming === null || incoming === '') continue;
    const current = book[key];
    const missing = current === undefined || current === null || current === '';
    if (missing) {
      book[key] = incoming;
    }
  }

  if (input.isbn && !book.isbn) {
    book.isbn = input.isbn;
    book.isbnNormalized = normalizeIsbn(input.isbn);
  }

  if (Array.isArray(input.genre) && input.genre.length > 0 && (!Array.isArray(book.genre) || book.genre.length === 0)) {
    book.genre = input.genre;
  }

  if (book.isModified()) {
    await book.save();
  }
}

// @desc    Create a new book
// @route   POST /api/books
// @access  Private
const createBook = asyncHandler(async (req, res) => {
  const {
    title,
    author,
    isbn,
    coverImage,
    description,
    genre,
    publishedYear,
    pageCount,
    language,
  } = req.body;

  if (!title || !author) {
    res.status(400);
    throw new Error('Title and author are required');
  }

  const isbnNormalized = normalizeIsbn(isbn);
  if (isbnNormalized) {
    const canonical = await findCanonicalByIsbnNormalized(isbnNormalized);
    if (canonical) {
      await hydrateCanonicalWithUserInput(canonical, {
        title: String(title).trim(),
        author: String(author).trim(),
        isbn,
        coverImage: coverImage || '',
        description: description || '',
        genre: parseGenre(genre),
        publishedYear,
        pageCount,
        language: language || 'English',
      });

      return res.status(200).json({
        reused: true,
        book: sanitizeBookForUser(canonical, req.user),
      });
    }
  }

  const existingBook = await Book.findOne({
    title: { $regex: new RegExp(`^${escapeRegex(title)}$`, 'i') },
    author: { $regex: new RegExp(`^${escapeRegex(author)}$`, 'i') },
    createdBy: req.user.id,
    isArchived: { $ne: true },
  });

  if (existingBook) {
    res.status(400);
    throw new Error('Book already exists in your library');
  }

  const book = await Book.create({
    title: String(title).trim(),
    author: String(author).trim(),
    isbn: isbn || '',
    isbnNormalized,
    coverImage: coverImage || '',
    description: description || '',
    genre: parseGenre(genre),
    publishedYear,
    pageCount,
    language: language || 'English',
    createdBy: req.user.id,
    visibility: 'private',
    isArchived: false,
  });

  res.status(201).json({
    reused: false,
    book: sanitizeBookForUser(book, req.user),
  });
});

// @desc    Search books
// @route   GET /api/books/search
// @access  Private
const searchBooks = asyncHandler(async (req, res) => {
  const { query, author, genre } = req.query;
  const limitInput = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitInput) ? Math.min(Math.max(limitInput, 1), 100) : 20;

  const andFilters = [
    { isArchived: { $ne: true } },
    {
      $or: [
        { visibility: 'public' },
        { createdBy: req.user.id },
      ],
    },
  ];

  if (query) {
    const value = String(query).trim();
    andFilters.push({
      $or: [
        { title: { $regex: value, $options: 'i' } },
        { author: { $regex: value, $options: 'i' } },
        { isbn: { $regex: value, $options: 'i' } },
      ],
    });
  }

  if (author) {
    andFilters.push({ author: { $regex: String(author), $options: 'i' } });
  }

  if (genre) {
    andFilters.push({ genre: { $in: [String(genre)] } });
  }

  const books = await Book.find({ $and: andFilters })
    .limit(limit)
    .sort({ title: 1 });

  res.json(books.map((book) => sanitizeBookForUser(book, req.user)));
});

// @desc    Get book by ID
// @route   GET /api/books/:id
// @access  Private/Public based on visibility
const getBookById = asyncHandler(async (req, res) => {
  const bookId = req.params.id;
  if (!isValidObjectId(bookId)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  const book = await Book.findById(bookId);
  if (!book || book.isArchived) {
    res.status(404);
    throw new Error('Book not found');
  }

  if (!canReadBook(book, req.user)) {
    res.status(403);
    throw new Error('Not authorized to view this book');
  }

  res.json(sanitizeBookForUser(book, req.user));
});

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private (owner)
const updateBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  const book = await Book.findById(id);
  if (!book || book.isArchived) {
    res.status(404);
    throw new Error('Book not found');
  }

  if (!isBookOwner(book, req.user)) {
    res.status(403);
    throw new Error('Not authorized to update this book');
  }

  const updates = getBookUpdatePayload(req.body);
  if (updates.isbnNormalized && updates.isbnNormalized !== book.isbnNormalized) {
    const canonical = await findCanonicalByIsbnNormalized(updates.isbnNormalized);
    if (canonical && String(canonical._id) !== String(book._id)) {
      res.status(409);
      throw new Error('ISBN is already associated with another canonical book');
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    book[key] = value;
  }

  const updatedBook = await book.save();
  res.json(sanitizeBookForUser(updatedBook, req.user));
});

// @desc    Update book visibility
// @route   PATCH /api/books/:id/visibility
// @access  Private (owner)
const updateBookVisibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { visibility } = req.body || {};

  if (!isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  if (!['private', 'public'].includes(visibility)) {
    res.status(400);
    throw new Error('Visibility must be either "private" or "public"');
  }

  const book = await Book.findById(id);
  if (!book || book.isArchived) {
    res.status(404);
    throw new Error('Book not found');
  }

  if (!isBookOwner(book, req.user)) {
    res.status(403);
    throw new Error('Not authorized to update this book visibility');
  }

  book.visibility = visibility;
  await book.save();

  res.json(sanitizeBookForUser(book, req.user));
});

// @desc    Delete book
// @route   DELETE /api/books/:id
// @access  Private (owner)
const deleteBook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  const book = await Book.findById(id);
  if (!book || book.isArchived) {
    res.status(404);
    throw new Error('Book not found');
  }

  if (!isBookOwner(book, req.user)) {
    res.status(403);
    throw new Error('Not authorized to delete this book');
  }

  const [readingProgress, review] = await Promise.all([
    ReadingProgress.findOne({ book: id }).lean(),
    Review.findOne({ bookId: id }).lean(),
  ]);

  if (readingProgress || review) {
    res.status(400);
    throw new Error('Cannot delete book that is referenced by reading progress or reviews');
  }

  await book.deleteOne();
  res.json({ message: 'Book removed' });
});

// @desc    Get user's books
// @route   GET /api/books
// @access  Private
const getMyBooks = asyncHandler(async (req, res) => {
  const books = await Book.find({
    createdBy: req.user.id,
    isArchived: { $ne: true },
  }).sort({ createdAt: -1 });

  res.json(books.map((book) => sanitizeBookForUser(book, req.user)));
});

module.exports = {
  createBook,
  searchBooks,
  getBookById,
  updateBook,
  updateBookVisibility,
  deleteBook,
  getMyBooks,
};
