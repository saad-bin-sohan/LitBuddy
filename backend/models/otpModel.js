// backend/models/otpModel.js

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: {
    type: String, // email or phone number
    required: true,
  },
  method: {
    type: String, // 'email' or 'phone'
    enum: ['email', 'phone'],
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('OTP', otpSchema);
