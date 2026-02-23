const mongoose = require('mongoose');

const pressResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: 160,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    resourceType: {
      type: String,
      enum: ['logo', 'brand-guidelines', 'screenshot', 'fact-sheet', 'press-release', 'media-mention', 'other'],
      default: 'other',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    fileUrl: {
      type: String,
      required: [true, 'Resource file URL is required'],
      trim: true,
      maxlength: 2048,
    },
    fileSizeLabel: {
      type: String,
      trim: true,
      default: '',
      maxlength: 60,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 70,
      default: '',
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 170,
      default: '',
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdBy: {
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

pressResourceSchema.index({ title: 'text', description: 'text', resourceType: 'text' });
pressResourceSchema.index({ status: 1, sortOrder: 1, publishedAt: -1 });

module.exports = mongoose.model('PressResource', pressResourceSchema);
