const mongoose = require('mongoose');

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
readingGoalSchema.methods.getCurrentMonthGoals = function() {
  const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11
  return this.monthlyGoals.get(currentMonth) || {
    targetBooks: 0,
    targetPages: 0,
    targetMinutes: 0,
    completedBooks: 0,
    completedPages: 0,
    completedMinutes: 0
  };
};

// Helper method to update monthly progress
readingGoalSchema.methods.updateMonthlyProgress = function(month, updates) {
  const currentGoals = this.monthlyGoals.get(month) || {
    targetBooks: 0,
    targetPages: 0,
    targetMinutes: 0,
    completedBooks: 0,
    completedPages: 0,
    completedMinutes: 0
  };
  
  this.monthlyGoals.set(month, { ...currentGoals, ...updates });
};

module.exports = mongoose.model('ReadingGoal', readingGoalSchema);
