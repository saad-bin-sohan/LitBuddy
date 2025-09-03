// backend/controllers/otpController.js

const asyncHandler = require('express-async-handler');
const OTP = require('../models/otpModel');
const User = require('../models/userModel');
const { sendOtpEmail, sendOtpSMS } = require('../utils/sendOtp');

// helper: generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/otp/send
// body: { email?, method } where method is 'email' or 'phone'
// If email provided + method phone => server looks up user's phone
const sendOtp = asyncHandler(async (req, res) => {
  const { email, method } = req.body;

  if (!method || !['email', 'phone'].includes(method)) {
    res.status(400);
    throw new Error('Method must be "email" or "phone"');
  }

  // Find identifier (if email provided, use it; otherwise method must provide identifier)
  let identifier = null;

  if (email) {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    identifier = method === 'email' ? user.email : user.phone;
    if (method === 'phone' && !identifier) {
      res.status(400);
      throw new Error('No phone number found for this account');
    }
  } else {
    res.status(400);
    throw new Error('Please provide email of the account to send OTP to');
  }

  // generate code and expiry
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // store OTP (overwrite previous OTPs for same identifier & method)
  await OTP.deleteMany({ identifier, method });
  await OTP.create({ identifier, method, code, expiresAt });

  // send
  if (method === 'email') {
    await sendOtpEmail(identifier, code);
  } else {
    await sendOtpSMS(identifier, code);
  }

  res.json({ message: 'OTP sent' });
});

// POST /api/otp/verify
// body: { email?, method, code }
// If method === 'phone' we will use user's phone
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, method, code } = req.body;

  if (!method || !code || !email) {
    res.status(400);
    throw new Error('email, method and code are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const identifier = method === 'email' ? user.email : user.phone;
  if (!identifier) {
    res.status(400);
    throw new Error('No identifier available for this method');
  }

  const otp = await OTP.findOne({ identifier, method, code });
  if (!otp) {
    res.status(400);
    throw new Error('Invalid OTP');
  }
  if (otp.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: otp._id });
    res.status(400);
    throw new Error('OTP expired');
  }

  // valid → remove OTP records for this identifier
  await OTP.deleteMany({ identifier });

  res.json({ message: 'OTP verified' });
});

module.exports = {
  sendOtp,
  verifyOtp,
};
