// backend/services/notificationService.js
const Notification = require('../models/notificationModel');
const socketUtil = (() => {
  try {
    return require('../utils/socket');
  } catch (e) {
    return null;
  }
})();

// Try to load a STOMP util if available (utils/stomp.js). This file is optional and may not exist yet.
let stompUtil = null;
try {
  // we keep this in try/catch so code continues to work if utils/stomp.js is not added yet
  stompUtil = require('../utils/stomp');
} catch (e) {
  stompUtil = null;
}

/**
 * Create a notification (persist) and emit to the user if connected.
 * payload: { userId, type, title, body, data }
 *
 * Delivery order:
 *  1) Persist to DB (source of truth)
 *  2) Try to publish via STOMP util (preferred)
 *  3) Fallback to socket.io emit (legacy)
 *
 * This function is intentionally tolerant of delivery failures (logs only).
 */
async function createAndSend({ userId, type = 'system', title = '', body = '', data = {} }) {
  // Persist to DB first (source of truth)
  const doc = await Notification.create({
    user: userId,
    type,
    title,
    body,
    data,
  });

  // Prepare payload that matches the previous socket emit shape
  const payload = {
    _id: doc._id,
    user: doc.user,
    type: doc.type,
    title: doc.title,
    body: doc.body,
    data: doc.data,
    read: doc.read,
    createdAt: doc.createdAt,
  };

  // 1) Preferred: publish via STOMP util if available
  try {
    if (stompUtil) {
      // Support two common shapes for the stomp util:
      //  - stompUtil.publish(destination, payload)  (returns Promise or void)
      //  - stompUtil.getClient() -> stomp client with .publish({destination, body})
      if (typeof stompUtil.publish === 'function') {
        // choose a per-user queue destination
        try {
          const dest = `/user/${userId}/queue/notifications`;
          // allow publish to be sync or async
          await Promise.resolve(stompUtil.publish(dest, payload));
        } catch (err) {
          console.error('notificationService: stompUtil.publish failed', err);
        }
      } else if (typeof stompUtil.getClient === 'function') {
        try {
          const client = stompUtil.getClient();
          if (client) {
            // if client exposes a "publish" like @stomp/stompjs Client
            if (typeof client.publish === 'function') {
              client.publish({
                destination: `/user/${userId}/queue/notifications`,
                body: JSON.stringify(payload),
              });
            } else {
              // If the client doesn't have publish, skip gracefully
            }
          }
        } catch (err) {
          console.error('notificationService: stompUtil.getClient().publish failed', err);
        }
      } else {
        // unknown shape - skip and fallback
      }

      // After attempting STOMP publish, return the DB doc (don't attempt socket.io)
      return doc;
    }
  } catch (err) {
    // Non-fatal — log and fall through to socket.io fallback
    console.error('notificationService: error while trying STOMP publish', err);
  }

  // 2) Fallback: legacy socket.io
  try {
    const io = socketUtil && typeof socketUtil.getIO === 'function' ? socketUtil.getIO() : null;
    if (io) {
      try {
        io.to(String(userId)).emit('notification', payload);
      } catch (err) {
        console.error('notificationService emit error (socket.io)', err);
      }
    }
  } catch (err) {
    // swallow
    console.error('notificationService: socket.io fallback error', err);
  }

  return doc;
}

module.exports = { createAndSend };