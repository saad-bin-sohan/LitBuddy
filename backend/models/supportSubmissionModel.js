const mongoose = require('mongoose');

const supportSubmissionSchema = new mongoose.Schema(
  {
    submissionType: {
      type: String,
      enum: ['contact', 'feedback'],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 160,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: 180,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      trim: true,
      default: 'general',
      maxlength: 80,
    },
    productArea: {
      type: String,
      trim: true,
      default: '',
      maxlength: 80,
    },
    status: {
      type: String,
      enum: ['new', 'in_review', 'resolved', 'closed'],
      default: 'new',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    pageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2048,
    },
    userAgent: {
      type: String,
      trim: true,
      default: '',
      maxlength: 600,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    adminNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 5000,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    sourceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

supportSubmissionSchema.index({ submissionType: 1, status: 1, createdAt: -1 });
supportSubmissionSchema.index({ createdAt: -1 });
supportSubmissionSchema.index({ subject: 'text', message: 'text', name: 'text', email: 'text' });

module.exports = mongoose.model('SupportSubmission', supportSubmissionSchema);
