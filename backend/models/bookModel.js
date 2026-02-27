const mongoose = require('mongoose');
const { normalizeIsbn } = require('../utils/isbn');

const bookSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Book title is required'],
      trim: true
    },
    author: { 
      type: String, 
      required: [true, 'Author name is required'],
      trim: true
    },
    isbn: { 
      type: String, 
      trim: true
    },
    isbnNormalized: {
      type: String,
      default: '',
      trim: true
    },
    coverImage: { 
      type: String, 
      default: '' // URL or base64 string for book cover
    },
    description: { 
      type: String, 
      default: '' 
    },
    genre: { 
      type: [String], 
      default: [] 
    },
    publishedYear: { 
      type: Number 
    },
    pageCount: { 
      type: Number 
    },
    language: { 
      type: String, 
      default: 'English' 
    },
    // For user-generated books or books not in external databases
    isCustom: { 
      type: Boolean, 
      default: false 
    },
    
    // GoodReads integration fields
    goodreadsId: { 
      type: String, 
      sparse: true 
    },
    goodreadsRating: { 
      type: Number, 
      min: 0, 
      max: 5 
    },
    goodreadsRatingsCount: { 
      type: Number, 
      min: 0 
    },
    // Google Books integration fields
    googleBooksId: {
      type: String,
      sparse: true
    },
    googleBooksRating: {
      type: Number,
      min: 0,
      max: 5
    },
    googleBooksRatingsCount: {
      type: Number,
      min: 0
    },
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private'
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    mergedInto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null
    },
    
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

bookSchema.pre('validate', function(next) {
  this.isbnNormalized = normalizeIsbn(this.isbn);
  next();
});

// Indexes for efficient queries
bookSchema.index({ title: 'text', author: 'text' });
bookSchema.index({ createdBy: 1 });
bookSchema.index({ isbnNormalized: 1 });
bookSchema.index({ visibility: 1, createdBy: 1, isArchived: 1 });

module.exports = mongoose.model('Book', bookSchema);
