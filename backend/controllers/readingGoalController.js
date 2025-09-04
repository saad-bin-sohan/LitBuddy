const ReadingGoal = require('../models/readingGoalModel');
const ReadingProgress = require('../models/readingProgressModel');
const asyncHandler = require('express-async-handler');

// @desc    Create or update reading goals
// @route   POST /api/reading-goals
// @access  Private
const setReadingGoals = asyncHandler(async (req, res) => {
  const { year, monthlyGoals, yearlyGoals } = req.body;
  const currentYear = year || new Date().getFullYear();

  let readingGoal = await ReadingGoal.findOne({ user: req.user.id, year: currentYear });

  if (readingGoal) {
    // Update existing goals
    if (monthlyGoals) {
      Object.keys(monthlyGoals).forEach(month => {
        readingGoal.updateMonthlyProgress(parseInt(month), monthlyGoals[month]);
      });
    }

    if (yearlyGoals) {
      readingGoal.yearlyGoals = { ...readingGoal.yearlyGoals, ...yearlyGoals };
    }

    await readingGoal.save();
  } else {
    // Create new goals
    readingGoal = await ReadingGoal.create({
      user: req.user.id,
      year: currentYear,
      monthlyGoals: monthlyGoals || {},
      yearlyGoals: yearlyGoals || {
        targetBooks: 0,
        targetPages: 0,
        targetMinutes: 0,
        completedBooks: 0,
        completedPages: 0,
        completedMinutes: 0
      }
    });
  }

  res.json(readingGoal);
});

// @desc    Get user's reading goals
// @route   GET /api/reading-goals
// @access  Private
const getReadingGoals = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const currentYear = year || new Date().getFullYear();

  let readingGoal = await ReadingGoal.findOne({ user: req.user.id, year: currentYear });

  if (!readingGoal) {
    // Create default goals if none exist
    readingGoal = await ReadingGoal.create({
      user: req.user.id,
      year: currentYear,
      yearlyGoals: {
        targetBooks: 12, // Default: 1 book per month
        targetPages: 0,
        targetMinutes: 0,
        completedBooks: 0,
        completedPages: 0,
        completedMinutes: 0
      }
    });
  }

  // Get current month's goals
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthGoals = readingGoal.getCurrentMonthGoals();

  // Calculate progress percentages
  const yearlyProgress = {
    books: readingGoal.yearlyGoals.targetBooks > 0 
      ? Math.round((readingGoal.yearlyGoals.completedBooks / readingGoal.yearlyGoals.targetBooks) * 100)
      : 0,
    pages: readingGoal.yearlyGoals.targetPages > 0
      ? Math.round((readingGoal.yearlyGoals.completedPages / readingGoal.yearlyGoals.targetPages) * 100)
      : 0,
    minutes: readingGoal.yearlyGoals.targetMinutes > 0
      ? Math.round((readingGoal.yearlyGoals.completedMinutes / readingGoal.yearlyGoals.targetMinutes) * 100)
      : 0
  };

  const monthlyProgress = {
    books: currentMonthGoals.targetBooks > 0
      ? Math.round((currentMonthGoals.completedBooks / currentMonthGoals.targetBooks) * 100)
      : 0,
    pages: currentMonthGoals.targetPages > 0
      ? Math.round((currentMonthGoals.completedPages / currentMonthGoals.targetPages) * 100)
      : 0,
    minutes: currentMonthGoals.targetMinutes > 0
      ? Math.round((currentMonthGoals.completedMinutes / currentMonthGoals.targetMinutes) * 100)
      : 0
  };

  const response = {
    ...readingGoal.toObject(),
    currentMonthGoals,
    yearlyProgress,
    monthlyProgress
  };

  res.json(response);
});

// @desc    Get reading achievements
// @route   GET /api/reading-goals/achievements
// @access  Private
const getAchievements = asyncHandler(async (req, res) => {
  const readingGoal = await ReadingGoal.findOne({ 
    user: req.user.id, 
    year: new Date().getFullYear() 
  });

  if (!readingGoal) {
    return res.json({ achievements: [] });
  }

  // Check for new achievements
  const newAchievements = await checkForNewAchievements(req.user.id, readingGoal);

  res.json({
    achievements: readingGoal.achievements,
    newAchievements
  });
});

// @desc    Update reading progress manually
// @route   PUT /api/reading-goals/progress
// @access  Private
const updateProgress = asyncHandler(async (req, res) => {
  const { month, updates } = req.body;
  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  let readingGoal = await ReadingGoal.findOne({ user: req.user.id, year: currentYear });

  if (!readingGoal) {
    res.status(404);
    throw new Error('Reading goals not found for this year');
  }

  // Update monthly progress
  readingGoal.updateMonthlyProgress(currentMonth, updates);

  // Update yearly totals
  if (updates.completedBooks) {
    readingGoal.yearlyGoals.completedBooks += updates.completedBooks;
  }
  if (updates.completedPages) {
    readingGoal.yearlyGoals.completedPages += updates.completedPages;
  }
  if (updates.completedMinutes) {
    readingGoal.yearlyGoals.completedMinutes += updates.completedMinutes;
  }

  await readingGoal.save();

  // Check for new achievements
  const newAchievements = await checkForNewAchievements(req.user.id, readingGoal);

  res.json({
    readingGoal,
    newAchievements
  });
});

// Helper function to check for new achievements
const checkForNewAchievements = async (userId, readingGoal) => {
  const newAchievements = [];
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthGoals = readingGoal.getCurrentMonthGoals();

  // Check for first book achievement
  if (readingGoal.yearlyGoals.completedBooks === 1) {
    const hasFirstBookAchievement = readingGoal.achievements.some(
      a => a.type === 'first-book'
    );
    
    if (!hasFirstBookAchievement) {
      newAchievements.push({
        type: 'first-book',
        title: 'First Book!',
        description: 'You completed your first book this year!',
        metadata: { bookCount: 1 }
      });
    }
  }

  // Check for goal reached achievements
  if (readingGoal.yearlyGoals.targetBooks > 0) {
    const progress = (readingGoal.yearlyGoals.completedBooks / readingGoal.yearlyGoals.targetBooks) * 100;
    
    if (progress >= 50 && progress < 100) {
      const hasHalfwayAchievement = readingGoal.achievements.some(
        a => a.type === 'milestone' && a.metadata?.milestone === 'halfway'
      );
      
      if (!hasHalfwayAchievement) {
        newAchievements.push({
          type: 'milestone',
          title: 'Halfway There!',
          description: 'You\'re halfway to your yearly reading goal!',
          metadata: { milestone: 'halfway', progress: Math.round(progress) }
        });
      }
    }
    
    if (progress >= 100) {
      const hasGoalReachedAchievement = readingGoal.achievements.some(
        a => a.type === 'goal-reached'
      );
      
      if (!hasGoalReachedAchievement) {
        newAchievements.push({
          type: 'goal-reached',
          title: 'Goal Achieved!',
          description: 'Congratulations! You\'ve reached your yearly reading goal!',
          metadata: { goalType: 'books', target: readingGoal.yearlyGoals.targetBooks }
        });
      }
    }
  }

  // Check for monthly achievements
  if (currentMonthGoals.targetBooks > 0 && currentMonthGoals.completedBooks >= currentMonthGoals.targetBooks) {
    const hasMonthlyAchievement = readingGoal.achievements.some(
      a => a.type === 'milestone' && a.metadata?.milestone === `month-${currentMonth}`
    );
    
    if (!hasMonthlyAchievement) {
      newAchievements.push({
        type: 'milestone',
        title: `Monthly Goal: ${currentMonth}`,
        description: `You've reached your reading goal for month ${currentMonth}!`,
        metadata: { milestone: `month-${currentMonth}`, month: currentMonth }
      });
    }
  }

  // Add new achievements to the reading goal
  if (newAchievements.length > 0) {
    readingGoal.achievements.push(...newAchievements);
    await readingGoal.save();
  }

  return newAchievements;
};

module.exports = {
  setReadingGoals,
  getReadingGoals,
  getAchievements,
  updateProgress
};
