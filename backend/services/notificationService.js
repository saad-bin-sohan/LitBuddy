// backend/services/notificationService.js
const Notification = require('../models/notificationModel');
const socketUtil = (() => {
  try {
    return require('../utils/socket');
  } catch (e) {
    return null;
  }
})();

// Prefer the in-app STOMP broker first
let stompBroker = null;
try {
  stompBroker = require('../utils/stompBroker');
} catch (e) {
  stompBroker = null;
}

// Legacy external STOMP util (optional)
let stompUtil = null;
try {
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

  // 1) Preferred: publish via in-app STOMP broker (unified destination)
  try {
    if (stompBroker && typeof stompBroker.publish === 'function') {
      const dest = `/topic/user.${userId}.notifications`;
      await Promise.resolve(stompBroker.publish(dest, payload));
      return doc;
    }
  } catch (err) {
    console.error('notificationService: error while trying in-app STOMP publish', err);
  }

  // 2) Secondary: legacy external STOMP util if available
  try {
    if (stompUtil) {
      const dest = `/user/${userId}/queue/notifications`;
      if (typeof stompUtil.publish === 'function') {
        await Promise.resolve(stompUtil.publish(dest, payload));
        return doc;
      } else if (typeof stompUtil.getClient === 'function') {
        const client = stompUtil.getClient();
        if (client && typeof client.publish === 'function') {
          client.publish({ destination: dest, body: JSON.stringify(payload) });
          return doc;
        }
      }
    }
  } catch (err) {
    console.error('notificationService: external STOMP publish failed', err);
  }

  // 3) Fallback: legacy socket.io
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