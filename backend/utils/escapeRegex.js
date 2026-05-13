// backend/utils/escapeRegex.js
//
// Escapes special regex metacharacters in a user-supplied string so it can
// be safely passed to MongoDB's $regex operator without risk of ReDoS.
// Matches the ECMAScript spec for regex metacharacters.
//
// Usage:
//   const { escapeRegex } = require('../utils/escapeRegex');
//   const re = new RegExp(escapeRegex(userInput), 'i');
//   Model.find({ name: { $regex: re } });

function escapeRegex(value) {
  if (!value || typeof value !== 'string') return '';
  // Escape all characters that have special meaning in a regex
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
