// backend/utils/generateResetToken.js
const crypto = require('crypto');

/**
 * Generates a secure random token, returns both plain token and hashed form (sha256).
 * We store the hashed form in DB and email the plain token to user.
 */
function generateResetToken() {
  const token = crypto.randomBytes(32).toString('hex'); // 64 chars
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hashed };
}

module.exports = generateResetToken;
