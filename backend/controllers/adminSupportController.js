const asyncHandler = require('express-async-handler');
const SupportSubmission = require('../models/supportSubmissionModel');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function toPositiveInt(input, fallback) {
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function clampLimit(input) {
  return Math.min(MAX_LIMIT, toPositiveInt(input, DEFAULT_LIMIT));
}

function cleanString(input, max = 5000) {
  return String(input || '').trim().slice(0, max);
}

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @desc    List support submissions
// @route   GET /api/admin/support/submissions
// @access  Private/Admin
const listSupportSubmissions = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = clampLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const type = cleanString(req.query.type, 24).toLowerCase();
  const status = cleanString(req.query.status, 32).toLowerCase();
  const search = cleanString(req.query.search, 120);

  const filter = {};

  if (type && ['contact', 'feedback'].includes(type)) {
    filter.submissionType = type;
  }

  if (status && ['new', 'in_review', 'resolved', 'closed'].includes(status)) {
    filter.status = status;
  }

  if (search) {
    const safe = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: safe }, { email: safe }, { subject: safe }, { message: safe }, { category: safe }];
  }

  const [items, total] = await Promise.all([
    SupportSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    SupportSubmission.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    limit,
  });
});

// @desc    Update support submission
// @route   PATCH /api/admin/support/submissions/:id
// @access  Private/Admin
const updateSupportSubmission = asyncHandler(async (req, res) => {
  const entity = await SupportSubmission.findById(req.params.id);
  if (!entity) {
    res.status(404);
    throw new Error('Support submission not found');
  }

  if (req.body.status !== undefined) {
    const status = cleanString(req.body.status, 32).toLowerCase();
    if (!['new', 'in_review', 'resolved', 'closed'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status value');
    }
    entity.status = status;
    entity.resolvedAt = status === 'resolved' || status === 'closed' ? new Date() : null;
  }

  if (req.body.priority !== undefined) {
    const priority = cleanString(req.body.priority, 16).toLowerCase();
    if (!['low', 'normal', 'high'].includes(priority)) {
      res.status(400);
      throw new Error('Invalid priority value');
    }
    entity.priority = priority;
  }

  if (req.body.adminNotes !== undefined) {
    entity.adminNotes = cleanString(req.body.adminNotes, 5000);
  }

  entity.updatedBy = req.user?._id || entity.updatedBy;
  await entity.save();

  res.json(entity);
});

module.exports = {
  listSupportSubmissions,
  updateSupportSubmission,
};
