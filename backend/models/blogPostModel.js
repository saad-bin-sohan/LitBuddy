const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
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
    excerpt: {
      type: String,
      trim: true,
      maxlength: 320,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Blog content is required'],
      trim: true,
      maxlength: 60000,
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2048,
    },
    tags: {
      type: [String],
      default: [],
    },
    authorName: {
      type: String,
      trim: true,
      default: 'LitBuddy Editorial Team',
      maxlength: 120,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
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

blogPostSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text' });
blogPostSchema.index({ status: 1, publishedAt: -1 });

module.exports = mongoose.model('BlogPost', blogPostSchema);
