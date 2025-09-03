// backend/controllers/passwordController.js

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const generateResetToken = require('../utils/generateResetToken');
const crypto = require('crypto');
const { verifyRecaptcha } = require('../services/captchaService');
const nodemailer = require('nodemailer');

// create transporter (reuse your EMAIL_USER / EMAIL_PASS env vars)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Helper to send password reset email
 */
async function sendResetEmail(toEmail, resetLink) {
  const mailOptions = {
    from: `LitBuddy <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'LitBuddy — Password Reset Request',
    text: `We received a request to reset your LitBuddy password. Click the link below to choose a new password (valid for 1 hour):

${resetLink}

If you did not request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your LitBuddy password. Click the link below to choose a new password (valid for 1 hour):</p>
           <p><a href="${resetLink}">${resetLink}</a></p>
           <p>If you did not request this, you can safely ignore this email.</p>`
  };

  await transporter.sendMail(mailOptions);
}

/**
 * POST /api/password/request
 * body: { email, recaptchaToken? }
 */
const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email, recaptchaToken } = req.body;
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  // Verify captcha (if configured)
  const captchaResult = await verifyRecaptcha(recaptchaToken);
  if (!captchaResult.success) {
    res.status(400);
    throw new Error('Failed CAPTCHA verification');
  }

  // Find user — if not found, still return success to avoid enumeration
  const user = await User.findOne({ email });

  if (user) {
    // generate token + store hashed token + expiry
    const { token, hashed } = generateResetToken();
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Build reset link (frontend will show a page reading token & email from query)
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendBase.replace(/\/$/, '')}/password-reset?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await sendResetEmail(email, resetLink);
      console.log(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error('Failed to send reset email:', err);
      // swallow error for user-level response, admins can check logs
    }
  }

  // Always respond with generic message
  res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
});

/**
 * POST /api/password/reset
 * body: { email, token, newPassword }
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    res.status(400);
    throw new Error('email, token and newPassword are required');
  }

  // password strength (same as registration)
  const isStrong = newPassword.length >= 6 && /\d/.test(newPassword) && /[A-Za-z]/.test(newPassword);
  if (!isStrong) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long and contain both letters and numbers');
  }

  const user = await User.findOne({ email });
  if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
    res.status(400);
    throw new Error('Invalid or expired token');
  }

  // check expiry
  if (user.resetPasswordExpires < new Date()) {
    // clear token fields
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    res.status(400);
    throw new Error('Token expired');
  }

  // compare token hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  if (hashedToken !== user.resetPasswordToken) {
    res.status(400);
    throw new Error('Invalid token');
  }

  // set new password (pre-save will hash)
  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: 'Password has been reset successfully' });
});

module.exports = {
  requestPasswordReset,
  resetPassword,
};
