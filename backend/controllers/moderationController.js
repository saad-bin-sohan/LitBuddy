// backend/controllers/moderationController.js
/**
 * Moderation controller
 *
 * Admin/moderator actions on reports and evidence.
 * - listReports (paginated, with filters)
 * - getReport (single)
 * - updateReportStatus (reviewed|escalated|resolved)
 * - addModeratorNote
 * - suspendUser / unsuspendUser (helper that uses User model)
 *
 * This controller intentionally avoids automatic destructive actions (like permanent bans)
 * unless explicit action provided. It also creates notifications for victims.
 */

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Report = require('../models/reportModel');
const Media = require('../models/mediaModel');
const User = require('../models/userModel');
const notificationService = require('../services/notificationService'); // may exist in your repo

// Helper to require valid ObjectId
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * List reports (admin)
 * Query params:
 *  - page, limit
 *  - status, category, context, severity
 *  - sort (createdAt, -createdAt)
 */
const listReports = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '25', 10)));

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.context) filter.context = req.query.context;
  if (req.query.severity) filter.severity = req.query.severity;

  const total = await Report.countDocuments(filter);
  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('reporter', 'name email displayName')
    .populate('reportedUser', 'name email displayName suspendedUntil isAdmin role')
    .populate('evidence') // relies on report.evidence being an array of ObjectId -> Media
    .lean();

  res.json({
    reports,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  });
});

/**
 * Get single report with evidence and moderation history
 */
const getReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ message: 'Invalid report id' });
  }

  const report = await Report.findById(id)
    .populate('reporter', 'name email displayName')
    .populate('reportedUser', 'name email displayName suspendedUntil isAdmin role')
    .populate('evidence')
    .lean();

  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json(report);
});

/**
 * Update report status and optionally add moderator note.
 * Body: { status, moderatorNote, action: { suspendUser: { days, reason } } }
 *
 * When escalated/resolved, you may attach moderator notes and optionally
 * take other actions (suspend user).
 */
const updateReportStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, moderatorNote, action } = req.body;

  if (!isValidId(id)) {
    return res.status(400).json({ message: 'Invalid report id' });
  }

  const allowedStatuses = ['open', 'reviewed', 'escalated', 'resolved'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${allowedStatuses.join(', ')}` });
  }

  const report = await Report.findById(id).populate('reportedUser reporter evidence');
  if (!report) return res.status(404).json({ message: 'Report not found' });

  // Update report document
  report.status = status;
  if (moderatorNote) {
    report.moderatorNotes = report.moderatorNotes || [];
    report.moderatorNotes.push({
      moderator: req.user._id,
      note: moderatorNote,
      createdAt: new Date(),
    });
  }
  if (status === 'resolved') {
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
  }
  await report.save();

  // If any moderator action requested (suspend user), perform it carefully
  if (action && action.suspendUser && action.suspendUser.userId) {
    const uid = action.suspendUser.userId;
    if (isValidId(uid)) {
      const days = Math.max(1, parseInt(action.suspendUser.days || '7', 10));
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const reason = action.suspendUser.reason || `Action from moderator on report ${report._id}`;

      await User.findByIdAndUpdate(uid, { suspendedUntil: until }, { new: true });
      // notify the suspended user (best-effort)
      try {
        await notificationService.createAndSend({
          userId: uid,
          type: 'suspension',
          title: 'Your account has been suspended',
          body: `Your account is suspended until ${until.toISOString()}. Reason: ${reason}`,
          data: { suspendedUntil: until.toISOString(), moderatorId: req.user._id },
        });
      } catch (err) {
        console.error('notify suspend failed', err);
      }
    }
  }

  // Optionally escalate: if escalated, we can flag evidence for moderator review (left simple)
  if (status === 'escalated') {
    // flag evidence items (if any)
    if (report.evidence && report.evidence.length > 0) {
      const evidenceIds = report.evidence.map((m) => (m._id ? m._id : m));
      await Media.updateMany(
        { _id: { $in: evidenceIds } },
        { $set: { moderationStatus: 'flagged' } },
      );
    }
  }

  // Send courtesy notification to the reporter that their report was reviewed/resolved
  try {
    await notificationService.createAndSend({
      userId: report.reporter._id,
      type: 'report_update',
      title: `Report ${status}`,
      body: `Your report ${report._id} has been marked as "${status}".`,
      data: { reportId: report._id, status },
    });
  } catch (err) {
    console.error('notify reporter failed', err);
  }

  res.json({ message: 'Report updated', reportId: report._id, status });
});

/**
 * Add a moderator note only (convenience endpoint)
 * Body: { note }
 */
const addModeratorNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid report id' });
  if (!note || typeof note !== 'string') return res.status(400).json({ message: 'Note is required' });

  const report = await Report.findById(id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  report.moderatorNotes = report.moderatorNotes || [];
  report.moderatorNotes.push({ moderator: req.user._id, note, createdAt: new Date() });
  await report.save();

  res.json({ message: 'Note added' });
});

/**
 * Suspend a user directly (admin action)
 * Body: { days, until, reason }
 */
const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params; // user id
  const { days, until, reason } = req.body;

  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid user id' });

  let suspendedUntil = null;
  if (until) {
    const d = new Date(until);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid until date' });
    suspendedUntil = d;
  } else {
    const dDays = Math.max(1, parseInt(days || '7', 10));
    suspendedUntil = new Date(Date.now() + dDays * 24 * 60 * 60 * 1000);
  }

  const user = await User.findByIdAndUpdate(id, { suspendedUntil }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  try {
    await notificationService.createAndSend({
      userId: user._id,
      type: 'suspension',
      title: 'Account suspended',
      body: `Your account has been suspended until ${suspendedUntil.toISOString()}. ${reason ? 'Reason: ' + reason : ''}`,
    });
  } catch (err) {
    console.error('notify suspendUser failed', err);
  }

  res.json({ message: 'User suspended', user });
});

/**
 * Unsuspend user
 */
const unsuspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid user id' });

  const user = await User.findByIdAndUpdate(id, { suspendedUntil: null }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  try {
    await notificationService.createAndSend({
      userId: user._id,
      type: 'system',
      title: 'Account reinstated',
      body: 'Your account has been reinstated and you may log in again.',
    });
  } catch (err) {
    console.error('notify unsuspend failed', err);
  }

  res.json({ message: 'User unsuspended', user });
});

module.exports = {
  listReports,
  getReport,
  updateReportStatus,
  addModeratorNote,
  suspendUser,
  unsuspendUser,
};
