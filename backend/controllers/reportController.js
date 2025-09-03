// backend/controllers/reportController.js
/**
 * Report controller (updated)
 *
 * - Saves multiple evidence items (from multer req.files or normalized req.savedFiles)
 * - Populates legacy `image` field from first evidence item for backward compatibility
 * - Accepts reportedUser as id or email; will try to resolve author from messageId when possible
 * - Supports severity/context/messageId fields from the frontend
 * - getReports supports flexible filters: status, category (case-insensitive / mapped), severity,
 *   reporter, reportedUser (id or email), paging.
 */

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Report = require('../models/reportModel');
const User = require('../models/userModel');

let Chat = null;
// Try to require Chat model if it exists (used to resolve message owner by messageId)
try {
  Chat = require('../models/chatModel');
} catch (err) {
  Chat = null;
  // Not fatal — message owner resolution will be skipped if Chat model is absent
}

// Map common frontend category keys to reportModel enum
const CATEGORY_MAP = {
  harassment: 'Harassment',
  spam: 'Spam',
  fake: 'Fake Profile',
  'fake profile': 'Fake Profile',
  'fake_profile': 'Fake Profile',
  'fake-profile': 'Fake Profile',
  inappropriate: 'Other',
  other: 'Other',
};

// Helper: normalize incoming category (case-insensitive)
function normalizeCategory(input) {
  if (!input) return null;
  const key = String(input).trim().toLowerCase();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  // try to match if frontend sent the canonical form already (case-insensitive)
  const candidates = Object.values(CATEGORY_MAP);
  const found = candidates.find((c) => c.toLowerCase() === key);
  return found || null;
}

// Helper: try to get primary evidence array from req.savedFiles or req.files
function buildEvidenceFromRequest(req) {
  const result = [];

  // 1) If upload middleware already created req.savedFiles (normalized), use it
  if (Array.isArray(req.savedFiles) && req.savedFiles.length > 0) {
    for (const f of req.savedFiles) {
      // expect f to have { url, mimeType, originalName } or similar
      result.push({
        url: f.url || f.path || f.publicUrl || '',
        mimeType: f.mimeType || f.mimetype || '',
        filename: f.originalName || f.originalname || f.name || '',
      });
    }
    return result;
  }

  // 2) If multer placed files in req.files (array) — typical when using upload.array(...)
  if (Array.isArray(req.files) && req.files.length > 0) {
    for (const f of req.files) {
      const url = f.filename ? `/uploads/${f.filename}` : (f.path || '');
      result.push({
        url,
        mimeType: f.mimetype || '',
        filename: f.originalname || f.filename || '',
      });
    }
    return result;
  }

  // 3) If multer used fields() and req.files is an object with arrays: req.files.evidence
  if (req.files && typeof req.files === 'object' && Array.isArray(req.files.evidence) && req.files.evidence.length > 0) {
    for (const f of req.files.evidence) {
      const url = f.filename ? `/uploads/${f.filename}` : (f.path || '');
      result.push({
        url,
        mimeType: f.mimetype || '',
        filename: f.originalname || f.filename || '',
      });
    }
    return result;
  }

  // nothing found
  return result;
}

/**
 * Submit a report
 * POST /api/report
 */
const submitReport = asyncHandler(async (req, res) => {
  const body = req.body || {};
  let { reportedUser, category: rawCategory, description, severity, context, messageId } = body;

  // normalize incoming category
  const category = normalizeCategory(rawCategory);

  // normalize severity and context with safe defaults
  severity = severity ? String(severity).toLowerCase() : 'medium';
  if (!['low', 'medium', 'high'].includes(severity)) severity = 'medium';
  context = context ? String(context).toLowerCase() : (messageId ? 'message' : (reportedUser ? 'profile' : 'other'));

  // Try to coerce messageId if it came as nested object
  if (!messageId && body.messageID) messageId = body.messageID;

  // If reportedUser not supplied and we have messageId and Chat model, try resolving the message owner
  if (!reportedUser && messageId && Chat) {
    try {
      // Attempt to find a chat document that contains this message id.
      // This assumes your Chat model stores messages as subdocuments with _id.
      const found = await Chat.findOne({ 'messages._id': messageId }, { 'messages.$': 1 });
      if (found && Array.isArray(found.messages) && found.messages.length > 0) {
        const msg = found.messages[0];
        // message may have `sender` as object or id
        if (msg.sender) {
          if (typeof msg.sender === 'string' || mongoose.Types.ObjectId.isValid(msg.sender)) {
            reportedUser = String(msg.sender);
          } else if (typeof msg.sender === 'object' && (msg.sender._id || msg.sender.id)) {
            reportedUser = String(msg.sender._id || msg.sender.id);
          }
        }
      }
    } catch (err) {
      // ignore resolution errors — fall back to requiring reportedUser below
      console.warn('reportController: message owner resolution failed', err?.message || err);
    }
  }

  // Require category and reportedUser (reportedUser can be resolved earlier)
  if (!category) {
    res.status(400);
    throw new Error('Category is required');
  }

  if (!reportedUser) {
    // enforce presence because reportModel requires reportedUser
    res.status(400);
    throw new Error('Reported user is required (provide reportedUser id/email or a messageId that the server can resolve)');
  }

  // If reportedUser is not a valid ObjectId, try to resolve by email
  if (!mongoose.Types.ObjectId.isValid(reportedUser)) {
    const maybeByEmail = await User.findOne({ email: reportedUser });
    if (maybeByEmail) {
      reportedUser = String(maybeByEmail._id);
    } else {
      res.status(400);
      throw new Error('Invalid reportedUser id or unknown email');
    }
  }

  // Prevent self-reporting
  if (req.user && String(req.user._id) === String(reportedUser)) {
    res.status(400);
    throw new Error('You cannot report yourself');
  }

  // Ensure the reported user exists
  const target = await User.findById(reportedUser);
  if (!target) {
    res.status(404);
    throw new Error('Reported user not found');
  }

  // Build evidence array from uploaded files if any
  const evidence = buildEvidenceFromRequest(req); // array of { url, mimeType, filename }
  const image = evidence.length > 0 ? evidence[0].url : (body.image || '');

  // Compose report payload aligned with updated schema
  const reportData = {
    reporter: req.user._id,
    reportedUser,
    category,
    description: description || '',
    severity,
    context: ['profile', 'message', 'other'].includes(context) ? context : 'other',
    messageId: messageId || '',
    evidence,
    image,
    status: 'Pending',
  };

  const report = await Report.create(reportData);

  // After creating a report: increment reported user's reportCount
  try {
    await User.updateOne({ _id: reportedUser }, { $inc: { reportCount: 1 } });
  } catch (err) {
    // non-fatal; log for diagnostics
    console.warn('reportController: failed to increment reportCount', err?.message || err);
  }

  // --- SAFE population: use a query-based populate to avoid document.populate chaining issues ---
  let populatedReport = null;
  try {
    populatedReport = await Report.findById(report._id)
      .populate('reporter', 'name email displayName')
      .populate('reportedUser', 'name email displayName')
      .lean();
  } catch (err) {
    // fallback to returning the created doc as-is (best-effort)
    console.warn('reportController: populate query failed', err?.message || err);
    populatedReport = report && report.toObject ? report.toObject() : report;
  }

  res.status(201).json(populatedReport);
});

/**
 * Get all reports (admin)
 * GET /api/report
 */
const getReports = asyncHandler(async (req, res) => {
  // Admin check: support both legacy isAdmin boolean and new role field
  const isAdmin = !!(req.user && (req.user.isAdmin || req.user.role === 'admin'));
  if (!isAdmin) {
    res.status(403);
    throw new Error('Access denied');
  }

  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limitRaw = parseInt(req.query.limit || '25', 10);
  const limit = Math.min(Math.max(1, limitRaw || 25), 200);

  const filter = {};

  // Status (exact match expected in model: Pending/Reviewed/Resolved). Accept case-insensitive
  if (req.query.status) {
    const s = String(req.query.status).trim();
    // allow 'pending' or 'Pending'
    filter.status = new RegExp(`^${s}$`, 'i');
  }

  // Category: attempt to normalize (harassment/spam/fake/other)
  if (req.query.category) {
    const cat = normalizeCategory(req.query.category);
    if (cat) {
      filter.category = cat;
    } else {
      // allow case-insensitive match against category
      filter.category = new RegExp(`^${String(req.query.category).trim()}$`, 'i');
    }
  }

  // Severity filter
  if (req.query.severity) {
    const sev = String(req.query.severity).toLowerCase();
    if (['low', 'medium', 'high'].includes(sev)) filter.severity = sev;
  }

  // Filter by reportedUser id or email
  if (req.query.reportedUser) {
    const v = String(req.query.reportedUser).trim();
    if (mongoose.Types.ObjectId.isValid(v)) {
      filter.reportedUser = v;
    } else {
      // try resolve email -> id
      const u = await User.findOne({ email: v }).select('_id');
      if (u) filter.reportedUser = u._id;
      else {
        // nothing found; use a regex to match reportedUser display (but reportedUser is an ObjectId - skip)
      }
    }
  }

  // Filter by reporter id or email
  if (req.query.reporter) {
    const v = String(req.query.reporter).trim();
    if (mongoose.Types.ObjectId.isValid(v)) {
      filter.reporter = v;
    } else {
      const u = await User.findOne({ email: v }).select('_id');
      if (u) filter.reporter = u._id;
    }
  }

  const total = await Report.countDocuments(filter);
  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('reporter', 'name email displayName')
    .populate('reportedUser', 'name email displayName')
    .lean();

  res.json({
    reports,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

module.exports = {
  submitReport,
  getReports,
};
