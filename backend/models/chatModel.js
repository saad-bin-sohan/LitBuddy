// backend/models/chatModel.js
const mongoose = require('mongoose');



const chatSchema = new mongoose.Schema(
  {
    // For now we expect exactly two participants per chat.
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: 'One-to-one chats must contain exactly two participants',
      },
    },


    // Use a canonical status instead of a boolean "paused"
    status: { type: String, enum: ['active', 'paused', 'closed', 'auto-closed'], default: 'active' },

    pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pausedAt: { type: Date, default: null },

    lastActive: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },

    // Denormalized last message — updated by chatService on every appendMessage.
    // Used for inbox preview without loading all messages.
    lastMessage: {
      text: { type: String, default: null },
      timestamp: { type: Date, default: null },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    // Per-user read tracking. Maps userId (string) → Date of last read.
    // Used to compute unread counts. Updated via PATCH /api/chat/:chatId/read.
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  { timestamps: true }
);

chatSchema.pre('save', function () {
  if (Array.isArray(this.participants) && this.participants.length > 1) {
    try {
      // sort by string representation and ensure ObjectId instances
      const sorted = this.participants.map((p) => String(p)).sort();
      this.participants = sorted.map((s) => new mongoose.Types.ObjectId(s));
    } catch (e) {
      // fallback: do nothing
    }
  }
});

// Index: prevent duplicate active/paused chats between same pair.
// This uses participants.0 and participants.1 (requires participants array to be sorted).
chatSchema.index(
  { 'participants.0': 1, 'participants.1': 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['active', 'paused'] } },
  }
);

// Additional index for quick inbox retrieval
chatSchema.index({ updatedAt: -1 });

// Index for quick participant lookup
chatSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
