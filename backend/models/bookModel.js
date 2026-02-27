const mongoose = require('mongoose');
const { normalizeIsbn, isValidNormalizedIsbn } = require('../utils/isbn');

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
      trim: true,
      set: normalizeIsbn,
      validate: {
        validator: (value) => isValidNormalizedIsbn(value),
        message: 'ISBN must be 10 or 13 characters after removing spaces/hyphens'
      }
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
      trim: true
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
    googleBooksId: {
      type: String,
      trim: true
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
    
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
bookSchema.index({ title: 'text', author: 'text' });
bookSchema.index({ createdBy: 1 });
bookSchema.index({ isbn: 1 }, { sparse: true });
bookSchema.index(
  { createdBy: 1, goodreadsId: 1 },
  {
    unique: true,
    partialFilterExpression: { goodreadsId: { $exists: true, $type: 'string', $ne: '' } },
  }
);
bookSchema.index(
  { createdBy: 1, googleBooksId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleBooksId: { $exists: true, $type: 'string', $ne: '' } },
  }
);

bookSchema.statics.normalizeIsbn = normalizeIsbn;

module.exports = mongoose.model('Book', bookSchema);
