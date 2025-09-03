// backend/utils/socket.js
let io = null;
let userRooms = new Map(); // Map userId to socket

/**
 * initIO(server) -> initializes socket.io and returns io instance.
 * getIO() -> returns io (or null if not initialized)
 */
function initIO(server) {
  if (io) return io;
  const { Server } = require('socket.io');

  // Build allowed origins list from env
  const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true); // allow Postman, curl, mobile apps
        if (
          allowedOrigins.includes(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST'],
    },
  });

  // Socket auth using JWT
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next();
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.userId) {
      // Join user's personal room
      socket.join(String(socket.userId));
      userRooms.set(String(socket.userId), socket);
      console.log(`Socket connected: user ${socket.userId}`);
    } else {
      console.log('Socket connected (anonymous)');
    }

    socket.on('disconnect', () => {
      if (socket.userId) {
        userRooms.delete(String(socket.userId));
      }
    });
  });

  return io;
}

function getIO() {
  return io;
}

/**
 * Broadcast message to specific users
 */
function broadcastToUsers(userIds, event, data) {
  if (!io) return;
  userIds.forEach((userId) => {
    io.to(String(userId)).emit(event, data);
  });
}

/**
 * Broadcast to a specific room/topic
 */
function broadcastToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, data);
}

module.exports = { initIO, getIO, broadcastToUsers, broadcastToRoom };
