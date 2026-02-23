const asyncHandler = require('express-async-handler');
const BlogPost = require('../models/blogPostModel');
const CareerOpening = require('../models/careerOpeningModel');
const PressResource = require('../models/pressResourceModel');
const slugify = require('../utils/slugify');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
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

function normalizeArray(input, maxItemLength = 240, maxItems = 30) {
  if (Array.isArray(input)) {
    return input
      .map((entry) => cleanString(entry, maxItemLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  if (typeof input === 'string') {
    return input
      .split(/\n|,/)
      .map((entry) => cleanString(entry, maxItemLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  return [];
}

async function ensureUniqueSlug(Model, requestedSlug, fallbackTitle, excludeId = null) {
  const base = slugify(requestedSlug || fallbackTitle || 'item');
  const safeBase = base || `item-${Date.now()}`;
  let candidate = safeBase;
  let counter = 1;

  while (true) {
    const existing = await Model.findOne({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).select('_id');
    if (!existing) return candidate;
    counter += 1;
    candidate = `${safeBase}-${counter}`;
  }
}

function setSeoDefaults(entity, fallbackTitle, fallbackDesc) {
  if (!entity.seoTitle) {
    entity.seoTitle = cleanString(fallbackTitle, 70);
  }
  if (!entity.seoDescription) {
    entity.seoDescription = cleanString(fallbackDesc, 170);
  }
}

function applyPublishState(entity, statusInput, publishedAtInput) {
  if (statusInput) {
    entity.status = statusInput;
  }

  if (publishedAtInput !== undefined) {
    entity.publishedAt = publishedAtInput ? new Date(publishedAtInput) : null;
  }

  if ((entity.status === 'published' || entity.status === 'open') && !entity.publishedAt) {
    entity.publishedAt = new Date();
  }

  if (entity.status === 'draft') {
    entity.publishedAt = null;
  }
}

// BLOG ADMIN
// @desc    List blog posts (admin)
// @route   GET /api/admin/content/blog
// @access  Private/Admin
const listBlogPosts = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = clampLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const status = cleanString(req.query.status, 32).toLowerCase();
  const search = cleanString(req.query.search, 120);

  const filter = {};
  if (status && ['draft', 'published', 'archived'].includes(status)) {
    filter.status = status;
  }
  if (search) {
    const safe = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: safe }, { excerpt: safe }, { tags: safe }, { slug: safe }];
  }

  const [items, total] = await Promise.all([
    BlogPost.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    BlogPost.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    limit,
  });
});

// @desc    Create blog post (admin)
// @route   POST /api/admin/content/blog
// @access  Private/Admin
const createBlogPost = asyncHandler(async (req, res) => {
  const title = cleanString(req.body.title, 160);
  const content = cleanString(req.body.content, 60000);

  if (!title || !content) {
    res.status(400);
    throw new Error('Title and content are required');
  }

  const slug = await ensureUniqueSlug(BlogPost, req.body.slug, title);

  const entity = new BlogPost({
    title,
    slug,
    excerpt: cleanString(req.body.excerpt, 320),
    content,
    coverImageUrl: cleanString(req.body.coverImageUrl, 2048),
    tags: normalizeArray(req.body.tags, 64, 20),
    authorName: cleanString(req.body.authorName, 120) || 'LitBuddy Editorial Team',
    seoTitle: cleanString(req.body.seoTitle, 70),
    seoDescription: cleanString(req.body.seoDescription, 170),
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
  });

  applyPublishState(entity, cleanString(req.body.status, 20), req.body.publishedAt);
  setSeoDefaults(entity, `${title} | LitBuddy Blog`, entity.excerpt || content.slice(0, 165));

  await entity.save();
  res.status(201).json(entity);
});

// @desc    Update blog post (admin)
// @route   PATCH /api/admin/content/blog/:id
// @access  Private/Admin
const updateBlogPost = asyncHandler(async (req, res) => {
  const entity = await BlogPost.findById(req.params.id);
  if (!entity) {
    res.status(404);
    throw new Error('Blog post not found');
  }

  if (req.body.title !== undefined) {
    const title = cleanString(req.body.title, 160);
    if (!title) {
      res.status(400);
      throw new Error('Title cannot be empty');
    }
    entity.title = title;
  }

  if (req.body.slug !== undefined || req.body.title !== undefined) {
    entity.slug = await ensureUniqueSlug(BlogPost, req.body.slug || entity.title, entity.title, entity._id);
  }

  if (req.body.content !== undefined) {
    const content = cleanString(req.body.content, 60000);
    if (!content) {
      res.status(400);
      throw new Error('Content cannot be empty');
    }
    entity.content = content;
  }

  if (req.body.excerpt !== undefined) entity.excerpt = cleanString(req.body.excerpt, 320);
  if (req.body.coverImageUrl !== undefined) entity.coverImageUrl = cleanString(req.body.coverImageUrl, 2048);
  if (req.body.tags !== undefined) entity.tags = normalizeArray(req.body.tags, 64, 20);
  if (req.body.authorName !== undefined) entity.authorName = cleanString(req.body.authorName, 120);
  if (req.body.seoTitle !== undefined) entity.seoTitle = cleanString(req.body.seoTitle, 70);
  if (req.body.seoDescription !== undefined) entity.seoDescription = cleanString(req.body.seoDescription, 170);

  applyPublishState(entity, cleanString(req.body.status, 20), req.body.publishedAt);
  setSeoDefaults(entity, `${entity.title} | LitBuddy Blog`, entity.excerpt || entity.content.slice(0, 165));

  entity.updatedBy = req.user?._id || entity.updatedBy;
  await entity.save();

  res.json(entity);
});

// @desc    Delete blog post (admin)
// @route   DELETE /api/admin/content/blog/:id
// @access  Private/Admin
const deleteBlogPost = asyncHandler(async (req, res) => {
  const entity = await BlogPost.findById(req.params.id);
  if (!entity) {
    res.status(404);
    throw new Error('Blog post not found');
  }

  await entity.deleteOne();
  res.json({ message: 'Blog post deleted' });
});

// CAREERS ADMIN
// @desc    List careers (admin)
// @route   GET /api/admin/content/careers
// @access  Private/Admin
const listCareerOpenings = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = clampLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const status = cleanString(req.query.status, 32).toLowerCase();
  const search = cleanString(req.query.search, 120);

  const filter = {};
  if (status && ['draft', 'open', 'closed', 'archived'].includes(status)) {
    filter.status = status;
  }
  if (search) {
    const safe = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: safe }, { summary: safe }, { location: safe }, { department: safe }, { slug: safe }];
  }

  const [items, total] = await Promise.all([
    CareerOpening.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    CareerOpening.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    limit,
  });
});

// @desc    Create career opening (admin)
// @route   POST /api/admin/content/careers
// @access  Private/Admin
const createCareerOpening = asyncHandler(async (req, res) => {
  const title = cleanString(req.body.title, 160);
  const summary = cleanString(req.body.summary, 1500);

  if (!title || !summary) {
    res.status(400);
    throw new Error('Title and summary are required');
  }

  const slug = await ensureUniqueSlug(CareerOpening, req.body.slug, title);

  const entity = new CareerOpening({
    title,
    slug,
    department: cleanString(req.body.department, 120) || 'General',
    location: cleanString(req.body.location, 140) || 'Dhaka, Bangladesh',
    employmentType: cleanString(req.body.employmentType, 32) || 'full-time',
    workplaceType: cleanString(req.body.workplaceType, 32) || 'hybrid',
    experienceLevel: cleanString(req.body.experienceLevel, 80) || 'Mid-Level',
    summary,
    responsibilities: normalizeArray(req.body.responsibilities, 240, 40),
    requirements: normalizeArray(req.body.requirements, 240, 40),
    niceToHave: normalizeArray(req.body.niceToHave, 240, 30),
    benefits: normalizeArray(req.body.benefits, 240, 30),
    applyEmail: cleanString(req.body.applyEmail, 160) || 'sohan.helpdesk@gmail.com',
    applyUrl: cleanString(req.body.applyUrl, 2048),
    seoTitle: cleanString(req.body.seoTitle, 70),
    seoDescription: cleanString(req.body.seoDescription, 170),
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
  });

  applyPublishState(entity, cleanString(req.body.status, 20), req.body.publishedAt);
  setSeoDefaults(entity, `${title} | LitBuddy Careers`, summary.slice(0, 165));

  await entity.save();
  res.status(201).json(entity);
});

// @desc    Update career opening (admin)
// @route   PATCH /api/admin/content/careers/:id
// @access  Private/Admin
const updateCareerOpening = asyncHandler(async (req, res) => {
  const entity = await CareerOpening.findById(req.params.id);
  if (!entity) {
    res.status(404);
    throw new Error('Career opening not found');
  }

  if (req.body.title !== undefined) {
    const title = cleanString(req.body.title, 160);
    if (!title) {
      res.status(400);
      throw new Error('Title cannot be empty');
    }
    entity.title = title;
  }

  if (req.body.slug !== undefined || req.body.title !== undefined) {
    entity.slug = await ensureUniqueSlug(CareerOpening, req.body.slug || entity.title, entity.title, entity._id);
  }

  if (req.body.summary !== undefined) {
    const summary = cleanString(req.body.summary, 1500);
    if (!summary) {
      res.status(400);
      throw new Error('Summary cannot be empty');
    }
    entity.summary = summary;
  }

  if (req.body.department !== undefined) entity.department = cleanString(req.body.department, 120);
  if (req.body.location !== undefined) entity.location = cleanString(req.body.location, 140);
  if (req.body.employmentType !== undefined) entity.employmentType = cleanString(req.body.employmentType, 32);
  if (req.body.workplaceType !== undefined) entity.workplaceType = cleanString(req.body.workplaceType, 32);
  if (req.body.experienceLevel !== undefined) entity.experienceLevel = cleanString(req.body.experienceLevel, 80);
  if (req.body.responsibilities !== undefined) entity.responsibilities = normalizeArray(req.body.responsibilities, 240, 40);
  if (req.body.requirements !== undefined) entity.requirements = normalizeArray(req.body.requirements, 240, 40);
  if (req.body.niceToHave !== undefined) entity.niceToHave = normalizeArray(req.body.niceToHave, 240, 30);
  if (req.body.benefits !== undefined) entity.benefits = normalizeArray(req.body.benefits, 240, 30);
  if (req.body.applyEmail !== undefined) entity.applyEmail = cleanString(req.body.applyEmail, 160);
  if (req.body.applyUrl !== undefined) entity.applyUrl = cleanString(req.body.applyUrl, 2048);
  if (req.body.seoTitle !== undefined) entity.seoTitle = cleanString(req.body.seoTitle, 70);
  if (req.body.seoDescription !== undefined) entity.seoDescription = cleanString(req.body.seoDescription, 170);

  applyPublishState(entity, cleanString(req.body.status, 20), req.body.publishedAt);
  setSeoDefaults(entity, `${entity.title} | LitBuddy Careers`, entity.summary.slice(0, 165));

  entity.updatedBy = req.user?._id || entity.updatedBy;
  await entity.save();

  res.json(entity);
});

// @desc    Delete career opening (admin)
// @route   DELETE /api/admin/content/careers/:id
// @access  Private/Admin
const deleteCareerOpening = asyncHandler(async (req, res) => {
  const entity = await CareerOpening.findById(req.params.id);
  if (!entity) {
    res.status(404);
    throw new Error('Career opening not found');
  }

  await entity.deleteOne();
  res.json({ message: 'Career opening deleted' });
});

// PRESS RESOURCES ADMIN
// @desc    List press resources (admin)
// @route   GET /api/admin/content/press-resources
// @access  Private/Admin
const listPressResources = asyncHandler(async (req, res) => {
  const page = toPositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = clampLimit(req.query.limit);
  const skip = (page - 1) * limit;
  const status = cleanString(req.query.status, 32).toLowerCase();
  const search = cleanString(req.query.search, 120);

  const filter = {};
  if (status && ['draft', 'published', 'archived'].includes(status)) {
    filter.status = status;
  }
  if (search) {
    const safe = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: safe }, { description: safe }, { resourceType: safe }, { slug: safe }];
  }

  const [items, total] = await Promise.all([
    PressResource.find(filter)
      .sort({ sortOrder: 1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    PressResource.countDocuments(filter),
  ]);

  res.json({
    items,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    total,
    limit,
  });
});

// @desc    Create press resource (admin)
// @route   POST /api/admin/content/press-resources
// @access  Private/Admin
const createPressResource = asyncHandler(async (req, res) => {
  const title = cleanString(req.body.title, 160);
  const fileUrl = cleanString(req.body.fileUrl, 2048);

  if (!title || !fileUrl) {
    res.status(400);
    throw new Error('Title and fileUrl are required');
  }

  const slug = await ensureUniqueSlug(PressResource, req.body.slug, title);

  const entity = new PressResource({
    title,
    slug,
    resourceType: cleanString(req.body.resourceType, 40) || 'other',
    description: cleanString(req.body.description, 500),
    fileUrl,
    fileSizeLabel: cleanString(req.body.fileSizeLabel, 60),
    sortOrder: Number.parseInt(req.body.sortOrder, 10) || 0,
    seoTitle: cleanString(req.body.seoTitle, 70),
    seoDescription: cleanString(req.body.seoDescription, 170),
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
  });

  applyPublishState(entity, cleanString(req.body.status, 20), req.body.publishedAt);
  setSeoDefaults(entity, `${title} | LitBuddy Press`, entity.description || `Official LitBuddy ${entity.resourceType} resource.`);

  await entity.save();
  res.status(201).json(entity);
});

// @desc    Update press resource (admin)
// @route   PATCH /api/admin/content/press-resources/:id
// @access  Private/Admin
const updatePressResource = asyncHandler(async (req, res) => {
  const entity = await PressResource.findById(req.params.id);
  if (!entity) {
    res.status(404);
    throw new Error('Press resource not found');
  }

  if (req.body.title !== undefined) {
    const title = cleanString(req.body.title, 160);
    if (!title) {
      res.status(400);
      throw new Error('Title cannot be empty');
    }
    entity.title = title;
  }

  if (req.body.slug !== undefined || req.body.title !== undefined) {
    entity.slug = await ensureUniqueSlug(PressResource, req.body.slug || entity.title, entity.title, entity._id);
  }

  if (req.body.fileUrl !== undefined) {
    const fileUrl = cleanString(req.body.fileUrl, 2048);
    if (!fileUrl) {
      res.status(400);
      throw new Error('fileUrl cannot be empty');
    }
    entity.fileUrl = fileUrl;
  }

  if (req.body.resourceType !== undefined) entity.resourceType = cleanString(req.body.resourceType, 40);
  if (req.body.description !== undefined) entity.description = cleanString(req.body.description, 500);
  if (req.body.fileSizeLabel !== undefined) entity.fileSizeLabel = cleanString(req.body.fileSizeLabel, 60);
  if (req.body.sortOrder !== undefined) entity.sortOrder = Number.parseInt(req.body.sortOrder, 10) || 0;
  if (req.body.seoTitle !== undefined) entity.seoTitle = cleanString(req.body.seoTitle, 70);
  if (req.body.seoDescription !== undefined) entity.seoDescription = cleanString(req.body.seoDescription, 170);

  applyPublishState(entity, cleanString(req.body.status, 20), req.body.publishedAt);
  setSeoDefaults(entity, `${entity.title} | LitBuddy Press`, entity.description || `Official LitBuddy ${entity.resourceType} resource.`);

  entity.updatedBy = req.user?._id || entity.updatedBy;
  await entity.save();

  res.json(entity);
});

// @desc    Delete press resource (admin)
// @route   DELETE /api/admin/content/press-resources/:id
// @access  Private/Admin
const deletePressResource = asyncHandler(async (req, res) => {
  const entity = await PressResource.findById(req.params.id);
  if (!entity) {
    res.status(404);
    throw new Error('Press resource not found');
  }

  await entity.deleteOne();
  res.json({ message: 'Press resource deleted' });
});

module.exports = {
  listBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listCareerOpenings,
  createCareerOpening,
  updateCareerOpening,
  deleteCareerOpening,
  listPressResources,
  createPressResource,
  updatePressResource,
  deletePressResource,
};
