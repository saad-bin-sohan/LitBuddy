const ReadingProgress = require('../models/readingProgressModel');
const Book = require('../models/bookModel');
const ReadingGoal = require('../models/readingGoalModel');
const asyncHandler = require('express-async-handler');

// @desc    Add book to reading list
// @route   POST /api/reading-progress
// @access  Private
const addBookToList = asyncHandler(async (req, res) => {
  let { bookId, status, totalPages, startDate } = req.body;

  // Check if book exists
  const book = await Book.findById(bookId);
  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  // Set totalPages from book if not provided
  if (!totalPages) {
    totalPages = book.pageCount || 0;
  }

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
    status,
    totalPages,
    startDate: startDate || new Date(),
    currentPage: status === 'currently-reading' ? 1 : 0
  });

  // Populate book details
  await readingProgress.populate('book');

  res.status(201).json(readingProgress);
});

// @desc    Update reading progress
// @route   PUT /api/reading-progress/:id
// @access  Private
const updateProgress = asyncHandler(async (req, res) => {
  const { currentPage, status, rating, review, notes, readingTime } = req.body;

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

  // Update finish date if completing book
  if (status === 'completed' && readingProgress.status !== 'completed') {
    req.body.finishDate = new Date();
  }

  // Update last read time
  req.body.lastReadAt = new Date();

  const updatedProgress = await ReadingProgress.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('book');

  // Update reading goals if book is completed
  if (status === 'completed' && readingProgress.status !== 'completed') {
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
    query.status = status;
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
  const currentYear = year || new Date().getFullYear();

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
    progressPercentage: Math.round((progress.currentPage / progress.totalPages) * 100)
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
  getReadingStats
};
