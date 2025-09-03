// backend/models/reportModel.js

const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },         // stored URL (e.g. /uploads/...)
    mimeType: { type: String, default: '' },
    filename: { type: String, default: '' },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // category: canonical strings used by backend/administrators
    category: {
      type: String,
      enum: ['Harassment', 'Spam', 'Fake Profile', 'Other'],
      required: true,
    },

    // severity: lower-case values (matches frontend select)
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // context of the report (profile / message / other)
    context: {
      type: String,
      enum: ['profile', 'message', 'other'],
      default: 'other',
    },

    // optional message id if the report targets a particular message
    messageId: { type: String, default: '' },

    description: { type: String, default: '' },

    // new: store multiple pieces of evidence (files / links)
    evidence: {
      type: [evidenceSchema],
      default: [],
    },

    // legacy single-image field preserved for backward compatibility
    image: { type: String, default: '' },

    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Resolved'],
      default: 'Pending',
    },

    // optional moderator notes, kept simple
    moderatorNotes: [
      {
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Indexes to speed common admin queries
reportSchema.index({ reportedUser: 1, status: 1, createdAt: -1 });
reportSchema.index({ createdAt: -1 });

// Helper method: first evidence URL (fallback to legacy image)
reportSchema.methods.getPrimaryEvidenceUrl = function () {
  if (Array.isArray(this.evidence) && this.evidence.length > 0) return this.evidence[0].url;
  return this.image || '';
};

module.exports = mongoose.model('Report', reportSchema);
