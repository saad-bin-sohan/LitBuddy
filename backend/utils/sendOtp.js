// backend/utils/sendOtp.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email Transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // Sender email (your app's email)
    pass: process.env.EMAIL_PASS   // Gmail App Password
  },
});

// Send OTP via Email
const sendOtpEmail = async (email, code) => {
  const mailOptions = {
    from: `LitBuddy <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP Code for LitBuddy Login',
    text: `Your OTP code is ${code}. It will expire in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ OTP sent to email: ${email}`);
};

// Send OTP via SMS
const sendOtpSMS = async (phone, code) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[DEV MODE] Would send OTP "${code}" to phone: ${phone}`);
    return;
  }

  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body: `Your OTP is ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });

  console.log(`✅ OTP sent to phone: ${phone}`);
};

module.exports = {
  sendOtpEmail,
  sendOtpSMS,
};
