// backend/controllers/notificationController.js
const asyncHandler = require('express-async-handler');
const Notification = require('../models/notificationModel');

// GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const notifs = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(notifs);
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const notif = await Notification.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notif) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json(notif);
});

module.exports = { getNotifications, markAsRead };