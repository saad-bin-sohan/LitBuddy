const mongoose = require('mongoose');

const clubMemberSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookClub',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'moderator', 'owner'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    permissions: {
      canInvite: { type: Boolean, default: false },
      canRemoveMembers: { type: Boolean, default: false },
      canManageChallenges: { type: Boolean, default: false },
      canSelectBooks: { type: Boolean, default: false },
      canModerateChat: { type: Boolean, default: false }
    },
    contributionStats: {
      messagesSent: { type: Number, default: 0 },
      challengesCompleted: { type: Number, default: 0 },
      booksSuggested: { type: Number, default: 0 },
      meetingsAttended: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
clubMemberSchema.index({ club: 1, user: 1 }, { unique: true });
clubMemberSchema.index({ user: 1, joinedAt: -1 });
clubMemberSchema.index({ club: 1, role: 1 });
clubMemberSchema.index({ club: 1, isActive: 1 });

// Pre-save hook to set permissions based on role
clubMemberSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'owner':
        this.permissions = {
          canInvite: true,
          canRemoveMembers: true,
          canManageChallenges: true,
          canSelectBooks: true,
          canModerateChat: true
        };
        break;
      case 'moderator':
        this.permissions = {
          canInvite: true,
          canRemoveMembers: true,
          canManageChallenges: true,
          canSelectBooks: false,
          canModerateChat: true
        };
        break;
      case 'member':
      default:
        this.permissions = {
          canInvite: false,
          canRemoveMembers: false,
          canManageChallenges: false,
          canSelectBooks: false,
          canModerateChat: false
        };
        break;
    }
  }
  next();
});

// Helper method to check if member has permission
clubMemberSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true;
};

// Helper method to promote member
clubMemberSchema.methods.promote = function() {
  if (this.role === 'member') {
    this.role = 'moderator';
    return this.save();
  }
  return Promise.reject(new Error('Cannot promote owner or already moderator'));
};

// Helper method to demote member
clubMemberSchema.methods.demote = function() {
  if (this.role === 'moderator') {
    this.role = 'member';
    return this.save();
  }
  return Promise.reject(new Error('Cannot demote owner or regular member'));
};

// Helper method to update activity
clubMemberSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('ClubMember', clubMemberSchema);
