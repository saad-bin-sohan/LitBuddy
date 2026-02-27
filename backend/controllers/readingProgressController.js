const ReadingProgress = require('../models/readingProgressModel');
const Book = require('../models/bookModel');
const ReadingGoal = require('../models/readingGoalModel');
const asyncHandler = require('express-async-handler');
const { isValidObjectId } = require('../utils/objectIdValidator');
const { normalizeReadingStatus } = require('../utils/readingStatus');

const toNonNegativeInt = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
};

const parseYear = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
};

const calculateProgressPercentage = (currentPage, totalPages) => {
  const safeTotal = toNonNegativeInt(totalPages, 0);
  if (safeTotal <= 0) return 0;
  const safeCurrent = toNonNegativeInt(currentPage, 0);
  return Math.max(0, Math.min(100, Math.round((safeCurrent / safeTotal) * 100)));
};

// @desc    Add book to reading list
// @route   POST /api/reading-progress
// @access  Private
const addBookToList = asyncHandler(async (req, res) => {
  let { bookId, status, totalPages, startDate } = req.body;
  let normalizedStatus;

  if (!isValidObjectId(bookId)) {
    res.status(400);
    throw new Error('Invalid book ID');
  }

  try {
    normalizedStatus = normalizeReadingStatus(status, { defaultStatus: 'want-to-read' });
  } catch (error) {
    res.status(error.statusCode || 400);
    throw error;
  }

  // Check if book exists
  const book = await Book.findById(bookId);
  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  if (book.createdBy.toString() !== req.user.id) {
    res.status(404);
    throw new Error('Book not found');
  }

  // Set totalPages from book if not provided
  totalPages = toNonNegativeInt(totalPages, toNonNegativeInt(book.pageCount, 0));

  // Check if already in list
  const existingProgress = await ReadingProgress.findOne({
    user: req.user.id,
    book: bookId
  });

  if (existingProgress) {
    res.status(400);
    throw new Error('Book is already in your reading list');
  }

  const readingProgress = await ReadingProgress.create({
    user: req.user.id,
    book: bookId,
    status: normalizedStatus,
    totalPages,
    startDate: startDate ? new Date(startDate) : new Date(),
    currentPage: normalizedStatus === 'currently-reading' ? 1 : 0
  });

  // Populate book details
  await readingProgress.populate('book');

  res.status(201).json(readingProgress);
});

// @desc    Update reading progress
// @route   PUT /api/reading-progress/:id
// @access  Private
const updateProgress = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid reading progress ID');
  }

  const readingProgress = await ReadingProgress.findById(req.params.id);

  if (!readingProgress) {
    res.status(404);
    throw new Error('Reading progress not found');
  }

  // Check if user owns this progress
  if (readingProgress.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to update this progress');
  }

  const updates = {};
  const allowedFields = ['currentPage', 'status', 'rating', 'review', 'notes', 'readingTime', 'totalPages'];
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    try {
      updates.status = normalizeReadingStatus(updates.status, {
        defaultStatus: readingProgress.status,
      });
    } catch (error) {
      res.status(error.statusCode || 400);
      throw error;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'currentPage')) {
    updates.currentPage = toNonNegativeInt(updates.currentPage, readingProgress.currentPage || 0);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'totalPages')) {
    updates.totalPages = toNonNegativeInt(updates.totalPages, readingProgress.totalPages || 0);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'readingTime')) {
    updates.readingTime = toNonNegativeInt(updates.readingTime, readingProgress.readingTime || 0);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'rating')) {
    if (updates.rating === '' || updates.rating === null) {
      updates.rating = null;
    } else {
      updates.rating = Number(updates.rating);
    }
  }

  const nextStatus = updates.status || readingProgress.status;
  if (nextStatus === 'completed' && readingProgress.status !== 'completed') {
    updates.finishDate = new Date();
  }

  updates.lastReadAt = new Date();

  const updatedProgress = await ReadingProgress.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('book');

  // Update reading goals if book is completed
  if (nextStatus === 'completed' && readingProgress.status !== 'completed') {
    await updateReadingGoals(req.user.id, updatedProgress);
  }

  res.json(updatedProgress);
});

// @desc    Get user's reading lists
// @route   GET /api/reading-progress/lists
// @access  Private
const getReadingLists = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let query = { user: req.user.id };
  if (status) {
    try {
      query.status = normalizeReadingStatus(status, { defaultStatus: null });
    } catch (error) {
      res.status(error.statusCode || 400);
      throw error;
    }
  }

  const readingProgress = await ReadingProgress.find(query)
    .populate('book')
    .sort({ updatedAt: -1 });

  // Group by status
  const lists = {
    'want-to-read': [],
    'currently-reading': [],
    'completed': [],
    'dnf': []
  };

  readingProgress.forEach(progress => {
    lists[progress.status].push(progress);
  });

  res.json(lists);
});

// @desc    Remove book from reading list
// @route   DELETE /api/reading-progress/:id
// @access  Private
const removeFromList = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid reading progress ID');
  }

  const readingProgress = await ReadingProgress.findById(req.params.id);

  if (!readingProgress) {
    res.status(404);
    throw new Error('Reading progress not found');
  }

  // Check if user owns this progress
  if (readingProgress.user.toString() !== req.user.id) {
    res.status(403);
    throw new Error('Not authorized to remove this progress');
  }

  await readingProgress.deleteOne();

  res.json({ message: 'Book removed from reading list' });
});

// @desc    Get reading statistics
// @route   GET /api/reading-progress/stats
// @access  Private
const getReadingStats = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const currentYear = year ? parseYear(year) : new Date().getFullYear();

  // Get completed books for the year
  const completedBooks = await ReadingProgress.find({
    user: req.user.id,
    status: 'completed',
    finishDate: {
      $gte: new Date(currentYear, 0, 1),
      $lt: new Date(currentYear + 1, 0, 1)
    }
  }).populate('book');

  // Calculate statistics
  const totalBooks = completedBooks.length;
  const totalPages = completedBooks.reduce((sum, progress) => sum + progress.totalPages, 0);
  const totalReadingTime = completedBooks.reduce((sum, progress) => sum + (progress.readingTime || 0), 0);

  // Get current reading progress
  const currentlyReading = await ReadingProgress.find({
    user: req.user.id,
    status: 'currently-reading'
  }).populate('book');

  const currentProgress = currentlyReading.map(progress => ({
    book: progress.book,
    currentPage: progress.currentPage,
    totalPages: progress.totalPages,
    progressPercentage: calculateProgressPercentage(progress.currentPage, progress.totalPages)
  }));

  const stats = {
    year: currentYear,
    totalBooks,
    totalPages,
    totalReadingTime,
    averagePagesPerBook: totalBooks > 0 ? Math.round(totalPages / totalBooks) : 0,
    currentlyReading: currentProgress,
    readingStreak: await calculateReadingStreak(req.user.id)
  };

  res.json(stats);
});

// Helper function to update reading goals
const updateReadingGoals = async (userId, readingProgress) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  let readingGoal = await ReadingGoal.findOne({ user: userId, year: currentYear });

  if (!readingGoal) {
    readingGoal = await ReadingGoal.create({
      user: userId,
      year: currentYear,
      yearlyGoals: {
        targetBooks: 0,
        targetPages: 0,
        targetMinutes: 0,
        completedBooks: 1,
        completedPages: readingProgress.totalPages,
        completedMinutes: readingProgress.readingTime || 0
      }
    });

    readingGoal.updateMonthlyProgress(currentMonth, {
      completedBooks: 1,
      completedPages: readingProgress.totalPages,
      completedMinutes: readingProgress.readingTime || 0
    });
  } else {
    // Update yearly goals
    readingGoal.yearlyGoals.completedBooks += 1;
    readingGoal.yearlyGoals.completedPages += readingProgress.totalPages;
    readingGoal.yearlyGoals.completedMinutes += readingProgress.readingTime || 0;

    // Update monthly goals
    readingGoal.updateMonthlyProgress(currentMonth, {
      completedBooks: readingGoal.getCurrentMonthGoals().completedBooks + 1,
      completedPages: readingGoal.getCurrentMonthGoals().completedPages + readingProgress.totalPages,
      completedMinutes: readingGoal.getCurrentMonthGoals().completedMinutes + (readingProgress.readingTime || 0)
    });
  }

  await readingGoal.save();
};

// Helper function to calculate reading streak
const calculateReadingStreak = async (userId) => {
  const completedBooks = await ReadingProgress.find({
    user: userId,
    status: 'completed'
  }).sort({ finishDate: -1 });

  if (completedBooks.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < completedBooks.length; i++) {
    if (!completedBooks[i].finishDate) {
      continue;
    }
    const bookDate = new Date(completedBooks[i].finishDate);
    const daysDiff = Math.round(Math.abs((today - bookDate) / oneDay));

    if (daysDiff <= 30) { // Consider books finished within 30 days as part of active streak
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

module.exports = {
  addBookToList,
  updateProgress,
  getReadingLists,
  removeFromList,
  getReadingStats,
  _private: {
    calculateProgressPercentage
  }
};
