/**
 * Updated userModel to support Roles (admin | reader) while maintaining backward compatibility
 * with the existing `isAdmin` boolean. This file:
 *  - Adds `role` field (enum: ['reader','admin']) with default 'reader'
 *  - Synchronizes `isAdmin` <-> `role` in pre-save hook for backward compatibility
 *  - Improves JSON output to remove sensitive fields by default
 *  - Adds helper instance methods for role checks and profile-setup detection
 *
 * Note: This keeps existing fields untouched where possible to avoid breaking other parts
 * of your app. A migration script would be recommended later to normalize existing records.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String },
    question: { type: String },
    answer: { type: String },
  },
  { _id: false }
);

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please add a name'] },

    displayName: { type: String, default: '' },

    // email optional (either email or phone must be provided at registration)
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },

    password: { type: String, required: [true, 'Please add a password'] },

    age: { type: Number, required: [true, 'Please provide your age'], min: 18 },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },

    bio: { type: String, default: '' },
    quote: { type: String, default: '' },

    // for this coursework you currently store base64 images — keep that, but consider S3 later
    profilePhotos: { type: [String], default: [] },

    favoriteBooks: { type: [String], default: [] },
    favoriteSongs: { type: [String], default: [] },

    preferences: {
      books: { type: [String], default: [] },
      music: { type: [String], default: [] },
    },

    answers: { type: [answerSchema], default: [] },

    isVerified: { type: Boolean, default: false },

    // Social: likes and matches (store ObjectId references)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Role & moderation
    // Backwards-compatible boolean flag (legacy). Will be synced with `role`.
    isAdmin: { type: Boolean, default: false },

    // New canonical role field — prefer this going forward.
    role: { type: String, enum: ['reader', 'admin'], default: 'reader' },

    reportCount: { type: Number, default: 0 },

    // Subscription / limits
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    maxActiveConversations: { type: Number, default: 3 }, // free default

    // NEW: current active conversations counter
    activeConversations: { type: Number, default: 0 },

    // Location for geo queries (optional)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // NEW: Track if profile setup wizard completed
    hasCompletedSetup: { type: Boolean, default: false },

    // Security
    failedLoginAttempts: { type: Number, default: 0 },
    lastFailedAt: { type: Date },
    devices: { type: [String], default: [] },
    loginIPs: { type: [String], default: [] },
    lastLoginAt: { type: Date },

    // Suspension info
    suspendedUntil: { type: Date, default: null },

    // Password reset fields (secure token hash + expiry)
    resetPasswordToken: { type: String, default: null }, // store SHA256(token)
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

// 2dsphere index for geo queries
userSchema.index({ location: '2dsphere' });

// Ensure email/phone uniqueness indexes are present at DB level (Mongoose statically sets them via schema options)
// Additional helpful index
userSchema.index({ isAdmin: 1 });
userSchema.index({ role: 1 });
userSchema.index({ reportCount: 1 });

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add a method to validate if the profile setup is complete
userSchema.methods.isProfileSetupComplete = function () {
  const requiredFields = ['name', 'age', 'gender'];
  // Consider a field present if it's not null/undefined/empty-string
  return requiredFields.every((field) => {
    const value = this[field];
    return value !== undefined && value !== null && value !== '';
  });
};

/**
 * Helper to check role membership (instance method)
 * Accepts 'admin' or 'reader' etc. Returns boolean.
 */
userSchema.methods.hasRole = function (role) {
  if (!role) return false;
  if (role === 'admin') {
    return !!(this.isAdmin || this.role === 'admin');
  }
  return this.role === role;
};

/**
 * Pre-save hook:
 *  - Keep isAdmin <-> role in sync for backward compatibility.
 *  - Ensure role has a default when not provided.
 *  - Update hasCompletedSetup from profile fields.
 *  - Hash password when modified.
 */
userSchema.pre('save', async function (next) {
  try {
    // Sync role/isAdmin
    // If isAdmin was set to true, ensure role === 'admin'
    if (this.isAdmin === true) {
      this.role = 'admin';
    }

    // If role explicitly set to admin, ensure isAdmin is true
    if (this.role === 'admin' && this.isAdmin !== true) {
      this.isAdmin = true;
    }

    // If role missing, default to 'reader'
    if (!this.role) {
      this.role = 'reader';
    }

    // Update `hasCompletedSetup` based on required fields
    this.hasCompletedSetup = this.isProfileSetupComplete();

    // Hash password when changed
    if (!this.isModified('password')) {
      return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Remove sensitive fields when converting to JSON or Object for API responses.
 * Keep a pragmatic set of fields exposed; remove password and reset tokens.
 */
function hideSensitive(doc, ret) {
  delete ret.password;
  delete ret.resetPasswordToken;
  delete ret.resetPasswordExpires;
  // Optionally hide devices/loginIPs from API responses for privacy
  delete ret.devices;
  delete ret.loginIPs;
  // hide __v
  delete ret.__v;
  return ret;
}

userSchema.set('toJSON', {
  transform: hideSensitive,
});
userSchema.set('toObject', {
  transform: hideSensitive,
});

// Export model
module.exports = mongoose.model('User', userSchema);
