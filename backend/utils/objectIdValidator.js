const mongoose = require('mongoose');

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

module.exports = {
  isValidObjectId
};
