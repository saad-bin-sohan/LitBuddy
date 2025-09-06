const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, trim: true },
  attachments: [{
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  }],
  timestamp: { type: Date, default: Date.now },
  messageType: {
    type: String,
    enum: ['text', 'system', 'announcement'],
    default: 'text'
  },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
});

// Custom validation: either text or attachments must be present for non-system messages
messageSchema.pre('validate', function(next) {
  if (this.messageType !== 'system' && !this.text && (!this.attachments || this.attachments.length === 0)) {
    this.invalidate('text', 'Either text or attachments must be provided');
  }
  next();
});

const groupChatSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookClub',
      required: true
    },
    name: {
      type: String,
      default: 'General Discussion'
    },
    description: { type: String },
    participants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      joinedAt: { type: Date, default: Date.now },
      role: {
        type: String,
        enum: ['member', 'moderator', 'owner'],
        default: 'member'
      }
    }],
    messages: [messageSchema],
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivity: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
groupChatSchema.index({ club: 1, createdAt: -1 });
groupChatSchema.index({ 'participants.user': 1 });
groupChatSchema.index({ lastActivity: -1 });

// Pre-save hook to update message count
groupChatSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.messageCount = this.messages.length;
    this.lastActivity = new Date();
  }
  next();
});

// Helper method to check if user is participant
groupChatSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Helper method to get participant role
groupChatSchema.methods.getParticipantRole = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  return participant ? participant.role : null;
};

// Helper method to check if user can moderate
groupChatSchema.methods.canModerate = function(userId) {
  const role = this.getParticipantRole(userId);
  return role === 'owner' || role === 'moderator';
};

// Helper method to add participant
groupChatSchema.methods.addParticipant = function(userId, role = 'member') {
  if (!this.isParticipant(userId)) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date()
    });
    return this.save();
  }
  return Promise.reject(new Error('User is already a participant'));
};

// Helper method to remove participant
groupChatSchema.methods.removeParticipant = function(userId) {
  const index = this.participants.findIndex(p => p.user.toString() === userId.toString());
  if (index > -1) {
    this.participants.splice(index, 1);
    return this.save();
  }
  return Promise.reject(new Error('User is not a participant'));
};

// Helper method to append message
groupChatSchema.methods.appendMessage = function(senderId, text, attachments = [], messageType = 'text') {
  if (!this.isParticipant(senderId)) {
    throw new Error('User is not a participant in this group chat');
  }

  const message = {
    sender: senderId,
    text: text,
    attachments: attachments,
    messageType: messageType,
    timestamp: new Date()
  };

  this.messages.push(message);
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('GroupChat', groupChatSchema);
