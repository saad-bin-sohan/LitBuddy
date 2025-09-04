const mongoose = require('mongoose');

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
      sparse: true // Allow multiple books without ISBN
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
bookSchema.index({ isbn: 1 });

module.exports = mongoose.model('Book', bookSchema);
