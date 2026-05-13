const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: [4000, 'Message text cannot exceed 4000 characters'],
    },
    attachments: [
      {
        filename: { type: String, required: true },
        originalname: { type: String, required: true },
        mimetype: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true },
      },
    ],
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Validation: message must have text or at least one attachment
messageSchema.pre('validate', function () {
  if (!this.text && (!this.attachments || this.attachments.length === 0)) {
    this.invalidate('text', 'Either text or attachments must be provided');
  }
});

// Compound index: retrieve all messages for a chat ordered by time (primary query)
messageSchema.index({ chatId: 1, timestamp: 1 });

// Compound index: fast unread count query
// (messages in a chat, from other users, after a given timestamp)
messageSchema.index({ chatId: 1, sender: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
