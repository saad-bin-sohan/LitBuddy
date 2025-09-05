const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['seasonal', 'genre', 'streak', 'custom'],
      required: true
    },
    category: {
      type: String,
      enum: ['summer', 'winter', 'spring', 'fall', 'holiday', 'mystery', 'romance', 'fantasy', 'scifi', 'nonfiction', 'classic', 'other'],
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    requirements: {
      booksToRead: { type: Number, default: 0 },
      pagesToRead: { type: Number, default: 0 },
      minutesToRead: { type: Number, default: 0 },
      genres: [{ type: String }],
      specificBooks: [{ type: String }],
      streakDays: { type: Number, default: 0 }
    },
    rewards: {
      points: { type: Number, default: 0 },
      badge: { type: String },
      title: { type: String }
    },
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      progress: {
        booksRead: { type: Number, default: 0 },
        pagesRead: { type: Number, default: 0 },
        minutesRead: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        lastReadDate: { type: Date }
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: { type: Date },
      points: { type: Number, default: 0 }
    }],
    maxParticipants: {
      type: Number,
      default: 1000
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
challengeSchema.index({ type: 1, isActive: 1 });
challengeSchema.index({ category: 1, isActive: 1 });
challengeSchema.index({ startDate: 1, endDate: 1 });
challengeSchema.index({ 'participants.user': 1 });

// Helper method to check if challenge is currently active
challengeSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

// Helper method to get participant by user ID
challengeSchema.methods.getParticipant = function(userId) {
  return this.participants.find(p => p.user.toString() === userId.toString());
};

// Helper method to update participant progress
challengeSchema.methods.updateParticipantProgress = function(userId, updates) {
  const participant = this.getParticipant(userId);
  if (participant) {
    Object.assign(participant.progress, updates);
    participant.lastReadDate = new Date();
  }
  return participant;
};

// Helper method to check if participant has completed the challenge
challengeSchema.methods.checkCompletion = function(userId) {
  const participant = this.getParticipant(userId);
  if (!participant) return false;

  const { requirements, progress } = this;
  
  const booksCompleted = progress.booksRead >= requirements.booksToRead;
  const pagesCompleted = progress.pagesRead >= requirements.pagesToRead;
  const minutesCompleted = progress.minutesRead >= requirements.minutesToRead;
  const streakCompleted = progress.longestStreak >= requirements.streakDays;

  return booksCompleted && pagesCompleted && minutesCompleted && streakCompleted;
};

module.exports = mongoose.model('Challenge', challengeSchema);
