const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: [
        'challenge_completion',
        'reading_streak',
        'books_read',
        'pages_read',
        'minutes_read',
        'genre_exploration',
        'seasonal_challenge',
        'first_challenge',
        'leaderboard_top',
        'perfect_streak'
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      default: '🏆'
    },
    points: {
      type: Number,
      default: 0
    },
    metadata: {
      challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
      streakDays: { type: Number },
      booksCount: { type: Number },
      pagesCount: { type: Number },
      minutesCount: { type: Number },
      genre: { type: String },
      season: { type: String },
      rank: { type: Number }
    },
    earnedAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
achievementSchema.index({ user: 1, type: 1 });
achievementSchema.index({ user: 1, earnedAt: -1 });
achievementSchema.index({ type: 1, earnedAt: -1 });

// Helper method to check if achievement is recent (within 7 days)
achievementSchema.methods.isRecent = function() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return this.earnedAt > sevenDaysAgo;
};

module.exports = mongoose.model('Achievement', achievementSchema);
