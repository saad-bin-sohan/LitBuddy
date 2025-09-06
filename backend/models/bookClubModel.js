const mongoose = require('mongoose');

const bookClubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Club name is required'],
      trim: true,
      maxlength: [100, 'Club name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Club description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    theme: {
      type: String,
      required: [true, 'Club theme is required'],
      enum: ['mystery', 'romance', 'fantasy', 'scifi', 'nonfiction', 'classic', 'historical', 'biography', 'self-help', 'other'],
      default: 'other'
    },
    genres: [{
      type: String,
      enum: ['mystery', 'romance', 'fantasy', 'scifi', 'nonfiction', 'classic', 'historical', 'biography', 'self-help', 'other']
    }],
    isPrivate: {
      type: Boolean,
      default: false
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    moderators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    memberCount: {
      type: Number,
      default: 1 // Owner is the first member
    },
    maxMembers: {
      type: Number,
      default: 50,
      min: [1, 'Maximum members must be at least 1'],
      max: [500, 'Maximum members cannot exceed 500']
    },
    currentBook: {
      bookId: { type: String },
      title: { type: String },
      author: { type: String },
      coverUrl: { type: String },
      selectedDate: { type: Date, default: Date.now },
      selectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    bookOfTheMonth: {
      bookId: { type: String },
      title: { type: String },
      author: { type: String },
      coverUrl: { type: String },
      selectedDate: { type: Date },
      votes: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        bookId: { type: String },
        votedAt: { type: Date, default: Date.now }
      }]
    },
    rules: {
      type: String,
      maxlength: [500, 'Rules cannot exceed 500 characters']
    },
    meetingSchedule: {
      frequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'none'],
        default: 'none'
      },
      dayOfWeek: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      time: { type: String }, // e.g., "19:00"
      timezone: { type: String, default: 'UTC' }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tags: [{ type: String, trim: true }],
    coverImage: { type: String }, // URL to club cover image
    lastActivity: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Indexes for efficient queries
bookClubSchema.index({ name: 1 });
bookClubSchema.index({ theme: 1 });
bookClubSchema.index({ owner: 1 });
bookClubSchema.index({ isPrivate: 1, isActive: 1 });
bookClubSchema.index({ createdAt: -1 });
bookClubSchema.index({ lastActivity: -1 });

// Virtual for member count (could be used for population)
bookClubSchema.virtual('members', {
  ref: 'ClubMember',
  localField: '_id',
  foreignField: 'club'
});

// Helper method to check if user is owner
bookClubSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

// Helper method to check if user is moderator
bookClubSchema.methods.isModerator = function(userId) {
  return this.moderators.some(mod => mod.toString() === userId.toString());
};

// Helper method to check if user can manage club
bookClubSchema.methods.canManage = function(userId) {
  return this.isOwner(userId) || this.isModerator(userId);
};

// Helper method to update last activity
bookClubSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('BookClub', bookClubSchema);
