// backend/models/suggestionModel.js
const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shownUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

// optional: index for faster daily-count queries
suggestionSchema.index({ user: 1, date: 1 });

// Enforces "don't show the same person twice in one day" at the data layer,
// and doubles as the lookup index for the upsert in matchController's
// getDailySuggestions.
suggestionSchema.index({ user: 1, shownUser: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Suggestion', suggestionSchema);