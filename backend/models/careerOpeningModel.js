const mongoose = require('mongoose');

const careerOpeningSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Role title is required'],
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
    department: {
      type: String,
      trim: true,
      default: 'General',
      maxlength: 120,
    },
    location: {
      type: String,
      trim: true,
      default: 'Dhaka, Bangladesh',
      maxlength: 140,
    },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
      default: 'full-time',
    },
    workplaceType: {
      type: String,
      enum: ['remote', 'on-site', 'hybrid'],
      default: 'hybrid',
    },
    experienceLevel: {
      type: String,
      trim: true,
      default: 'Mid-Level',
      maxlength: 80,
    },
    summary: {
      type: String,
      required: [true, 'Role summary is required'],
      trim: true,
      maxlength: 1500,
    },
    responsibilities: {
      type: [String],
      default: [],
    },
    requirements: {
      type: [String],
      default: [],
    },
    niceToHave: {
      type: [String],
      default: [],
    },
    benefits: {
      type: [String],
      default: [],
    },
    applyEmail: {
      type: String,
      trim: true,
      default: 'sohan.helpdesk@gmail.com',
      maxlength: 160,
    },
    applyUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2048,
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed', 'archived'],
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

careerOpeningSchema.index({ title: 'text', summary: 'text', department: 'text', location: 'text' });
careerOpeningSchema.index({ status: 1, publishedAt: -1 });

module.exports = mongoose.model('CareerOpening', careerOpeningSchema);
