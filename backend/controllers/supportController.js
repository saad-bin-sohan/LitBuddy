const asyncHandler = require('express-async-handler');
const SupportSubmission = require('../models/supportSubmissionModel');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(input, max = 5000) {
  return String(input || '').trim().slice(0, max);
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  if (xff) return String(xff).split(',')[0].trim().slice(0, 120);
  return String(req.connection?.remoteAddress || req.ip || '').slice(0, 120);
}

function validatePayload({ name, email, subject, message }) {
  if (!name || name.length < 2) {
    return 'A valid name is required';
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return 'A valid email address is required';
  }
  if (!subject || subject.length < 4) {
    return 'Subject must be at least 4 characters long';
  }
  if (!message || message.length < 15) {
    return 'Message must be at least 15 characters long';
  }
  return null;
}

async function createSupportSubmission(req, res, submissionType) {
  const payload = {
    name: cleanString(req.body.name, 120),
    email: cleanString(req.body.email, 160).toLowerCase(),
    subject: cleanString(req.body.subject, 180),
    message: cleanString(req.body.message, 5000),
    category: cleanString(req.body.category || 'general', 80).toLowerCase(),
    productArea: cleanString(req.body.productArea || '', 80),
    pageUrl: cleanString(req.body.pageUrl || '', 2048),
    userAgent: cleanString(req.headers['user-agent'] || '', 600),
    ipAddress: getClientIp(req),
    submissionType,
  };

  if (submissionType === 'feedback') {
    const rating = Number.parseInt(req.body.rating, 10);
    if (Number.isFinite(rating) && rating >= 1 && rating <= 5) {
      payload.rating = rating;
    }
  }

  const errorMessage = validatePayload(payload);
  if (errorMessage) {
    res.status(400);
    throw new Error(errorMessage);
  }

  const submission = await SupportSubmission.create(payload);

  res.status(201).json({
    message:
      submissionType === 'contact'
        ? 'Your contact request has been submitted. Our support team will review it shortly.'
        : 'Your feedback has been submitted. Thank you for helping us improve LitBuddy.',
    submissionId: submission._id,
  });
}

// @desc    Submit contact form
// @route   POST /api/support/contact
// @access  Public
const submitContact = asyncHandler(async (req, res) => {
  await createSupportSubmission(req, res, 'contact');
});

// @desc    Submit feedback form
// @route   POST /api/support/feedback
// @access  Public
const submitFeedback = asyncHandler(async (req, res) => {
  await createSupportSubmission(req, res, 'feedback');
});

module.exports = {
  submitContact,
  submitFeedback,
};
