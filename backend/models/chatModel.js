// backend/models/chatModel.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema(
  {
    // For now we expect exactly two participants per chat.
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],

    messages: [messageSchema],

    // Use a canonical status instead of a boolean "paused"
    status: { type: String, enum: ['active', 'paused', 'closed', 'auto-closed'], default: 'active' },

    pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pausedAt: { type: Date, default: null },

    lastActive: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Pre-save hook: ensure participants are stored in deterministic sorted order (by string)
chatSchema.pre('save', function (next) {
  if (Array.isArray(this.participants) && this.participants.length > 1) {
    try {
      // sort by string representation and ensure ObjectId instances
      const sorted = this.participants.map((p) => String(p)).sort();
      this.participants = sorted.map((s) => new mongoose.Types.ObjectId(s));
    } catch (e) {
      // fallback: do nothing
    }
  }
  next();
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
