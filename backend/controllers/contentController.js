const asyncHandler = require('express-async-handler');
const BlogPost = require('../models/blogPostModel');
const CareerOpening = require('../models/careerOpeningModel');
const PressResource = require('../models/pressResourceModel');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 50;

function toPositiveInt(input, fallback) {
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function clampLimit(input) {
  return Math.min(MAX_LIMIT, toPositiveInt(input, DEFAULT_LIMIT));
}

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function publishedVisibilityFilter() {
  return {
    status: 'published',
    $or: [{ publishedAt: { $lte: new Date() } }, { publishedAt: null }],
  };
}

function publishedAtVisibilityClause() {
  return { $or: [{ publishedAt: { $lte: new Date() } }, { publishedAt: null }] };
}

// @desc    Public blog listing
// @route   GET /api/content/blog
// @access  Public
const getBlogPosts = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = clampLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const tag = String(req.query.tag || '').trim();
  const search = String(req.query.search || '').trim();

  const filter = { ...publishedVisibilityFilter() };

  if (tag) {
    filter.tags = { $elemMatch: { $regex: new RegExp(`^${escapeRegex(tag)}$`, 'i') } };
  }

  if (search) {
    const safe = new RegExp(escapeRegex(search), 'i');
    filter.$and = [
      {
        $or: [{ title: safe }, { excerpt: safe }, { content: safe }, { tags: safe }],
      },
    ];
  }

  const [posts, total] = await Promise.all([
    BlogPost.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    BlogPost.countDocuments(filter),
  ]);

  res.json({
    posts,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    limit,
  });
});

// @desc    Public blog detail by slug
// @route   GET /api/content/blog/:slug
// @access  Public
const getBlogPostBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  if (!slug) {
    res.status(400);
    throw new Error('Blog slug is required');
  }

  const post = await BlogPost.findOne({
    ...publishedVisibilityFilter(),
    slug,
  }).select('-__v');

  if (!post) {
    res.status(404);
    throw new Error('Blog post not found');
  }

  res.json(post);
});

// @desc    Public careers listing
// @route   GET /api/content/careers
// @access  Public
const getCareerOpenings = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = clampLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const requestedStatus = String(req.query.status || 'open').trim().toLowerCase();

  const allowedStatuses = new Set(['open', 'closed']);
  const filter = {
    status: requestedStatus === 'all' ? { $in: ['open', 'closed'] } : (allowedStatuses.has(requestedStatus) ? requestedStatus : 'open'),
    ...publishedAtVisibilityClause(),
  };

  if (search) {
    const safe = new RegExp(escapeRegex(search), 'i');
    filter.$and = [
      {
        $or: [
          { title: safe },
          { summary: safe },
          { department: safe },
          { location: safe },
        ],
      },
    ];
  }

  const [jobs, total] = await Promise.all([
    CareerOpening.find(filter)
      .sort({ status: 1, publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v'),
    CareerOpening.countDocuments(filter),
  ]);

  res.json({
    jobs,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    limit,
  });
});

// @desc    Public career detail by slug
// @route   GET /api/content/careers/:slug
// @access  Public
const getCareerOpeningBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  if (!slug) {
    res.status(400);
    throw new Error('Career slug is required');
  }

  const role = await CareerOpening.findOne({
    slug,
    status: { $in: ['open', 'closed'] },
    ...publishedAtVisibilityClause(),
  }).select('-__v');

  if (!role) {
    res.status(404);
    throw new Error('Career opening not found');
  }

  res.json(role);
});

// @desc    Public press resources list
// @route   GET /api/content/press/resources
// @access  Public
const getPressResources = asyncHandler(async (_req, res) => {
  const resources = await PressResource.find({
    ...publishedVisibilityFilter(),
  })
    .sort({ sortOrder: 1, publishedAt: -1, createdAt: -1 })
    .select('-__v');

  res.json({ resources });
});

module.exports = {
  getBlogPosts,
  getBlogPostBySlug,
  getCareerOpenings,
  getCareerOpeningBySlug,
  getPressResources,
};
