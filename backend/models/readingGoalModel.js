const mongoose = require('mongoose');

const EMPTY_MONTH_GOALS = {
  targetBooks: 0,
  targetPages: 0,
  targetMinutes: 0,
  completedBooks: 0,
  completedPages: 0,
  completedMinutes: 0
};

const normalizeMonthKey = (month) => {
  const parsed = Number.parseInt(String(month), 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
    return null;
  }
  return String(parsed);
};

const readingGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear()
    },
    monthlyGoals: {
      type: Map,
      of: {
        targetBooks: { type: Number, default: 0 },
        targetPages: { type: Number, default: 0 },
        targetMinutes: { type: Number, default: 0 }, // reading time in minutes
        completedBooks: { type: Number, default: 0 },
        completedPages: { type: Number, default: 0 },
        completedMinutes: { type: Number, default: 0 }
      },
      default: {}
    },
    yearlyGoals: {
      targetBooks: { type: Number, default: 0 },
      targetPages: { type: Number, default: 0 },
      targetMinutes: { type: Number, default: 0 },
      completedBooks: { type: Number, default: 0 },
      completedPages: { type: Number, default: 0 },
      completedMinutes: { type: Number, default: 0 }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Achievement tracking
    achievements: [{
      type: {
        type: String,
        enum: ['first-book', 'reading-streak', 'goal-reached', 'milestone'],
        required: true
      },
      title: { type: String, required: true },
      description: { type: String, required: true },
      earnedAt: { type: Date, default: Date.now },
      metadata: { type: mongoose.Schema.Types.Mixed }
    }]
  },
  { timestamps: true }
);

// Compound index to ensure one goal per user per year
readingGoalSchema.index({ user: 1, year: 1 }, { unique: true });

// Indexes for efficient queries
readingGoalSchema.index({ user: 1, isActive: 1 });

// Helper method to get current month's goals
readingGoalSchema.methods.getCurrentMonthGoals = function(month = new Date().getMonth() + 1) {
  const monthKey = normalizeMonthKey(month);
  if (!monthKey) {
    return { ...EMPTY_MONTH_GOALS };
  }

  const monthGoals = this.monthlyGoals.get(monthKey);
  return monthGoals || { ...EMPTY_MONTH_GOALS };
};

// Helper method to update monthly progress
readingGoalSchema.methods.updateMonthlyProgress = function(month, updates) {
  const monthKey = normalizeMonthKey(month);
  if (!monthKey) {
    const err = new Error('Month must be between 1 and 12');
    err.statusCode = 400;
    throw err;
  }

  const currentGoals = this.monthlyGoals.get(monthKey) || { ...EMPTY_MONTH_GOALS };
  
  this.monthlyGoals.set(monthKey, { ...currentGoals, ...(updates || {}) });
};

readingGoalSchema.statics.normalizeMonthKey = normalizeMonthKey;

module.exports = mongoose.model('ReadingGoal', readingGoalSchema);
