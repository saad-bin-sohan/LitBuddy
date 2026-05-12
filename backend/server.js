// backend/server.js

// 1. Import core packages
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); // <-- added for parsing httpOnly cookies
process.env.DOTENV_CONFIG_QUIET = process.env.DOTENV_CONFIG_QUIET || 'true';
dotenv.config();

// 2. Import custom modules
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const socketUtil = require('./utils/socket'); // legacy socket.io helper (kept for fallback)
const upload = require('./middleware/uploadMiddleware'); // for serving /uploads
const requestContext = require('./middleware/requestContext');
const httpEventLogger = require('./middleware/httpEventLogger');
const { csrfProtect } = require('./middleware/csrfMiddleware');
const { logger, sanitizeForLogs } = require('./utils/logger');

// 2.5 Optional auth utils (we will use verify helper if present)
let authUtils = null;
try {
  authUtils = require('./middleware/authMiddleware');
} catch (err) {
  // If for some reason auth middleware isn't resolvable yet, we'll fallback to inline JWT verification.
  authUtils = null;
}

process.on('unhandledRejection', (reason) => {
  const rejectionError =
    reason instanceof Error
      ? reason
      : new Error(typeof reason === 'string' ? reason : 'Unhandled rejection with non-error value');
  logger.fatal(
    { err: rejectionError, reason: sanitizeForLogs(reason, { maxDepth: 2 }) },
    'process.unhandled_rejection'
  );

  // Preserve crash semantics for unhandled async failures.
  setImmediate(() => {
    throw rejectionError;
  });
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  logger.fatal({ err, origin }, 'process.uncaught_exception');
});

// 4. Connect to MongoDB
connectDB();

// 5. Initialize Express app
const app = express();

// Trust exactly one proxy hop (Render/Railway/Vercel reverse proxy).
// Setting this to 1 means Express only trusts the first X-Forwarded-For
// entry added by our actual proxy, not arbitrary client-supplied values.
app.set('trust proxy', 1);

// Attach request id and request-scoped logger
app.use(requestContext);

// 6. Body parsers (profile update uses large limit for base64 photos;
//    all other routes use 1 MB default)
// 6a. Large body parser for base64 photo uploads -- profile update only.
//     Must be registered BEFORE the global parser so that /api/profile
//     requests are parsed here and the global parser below skips them.
app.use('/api/profile', express.json({ limit: '12mb' }));
app.use('/api/profile', express.urlencoded({ limit: '12mb', extended: true }));

// 6b. Default body parser for all other routes (1 MB is generous for JSON APIs).
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Parse cookies so we can read httpOnly cookies in middleware/controllers
app.use(cookieParser());

// Log only errors and slow requests
app.use(httpEventLogger);

/**
 * 7. CORS
 * - Allows common localhost dev ports by default
 * - Also respects FRONTEND_URL or FRONTEND_URLS (comma-separated)
 * - Permissive for null origin (mobile apps, curl, Postman)
 */
const DEFAULT_ALLOWED = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  'https://litbuddy.vercel.app', // Update this to your actual Vercel domain
]);

const configured =
  (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const ALLOWED = new Set([...DEFAULT_ALLOWED, ...configured]);

const isLocalhostOrigin = (o) =>
  /^http:\/\/localhost:\d+$/.test(o || '') || /^http:\/\/127\.0\.0\.1:\d+$/.test(o || '');

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // allow tools/curl/mobile apps
    if (ALLOWED.has(origin) || isLocalhostOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));

/**
 * 7.5 Path sanity fix:
 * Some frontends accidentally set BACKEND_URL to include "/api".
 * If a client hits "/api/api/*", rewrite it to "/api/*" so requests don't 404.
 */
app.use((req, _res, next) => {
  if (req.url === '/api/api') {
    req.url = '/api';
  } else if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api/, '/api');
  }
  next();
});

// CSRF protection: require X-Requested-With on all mutating requests
app.use(csrfProtect);

// 8. Health endpoints
app.get('/', (req, res) => {
  res.send('LitBuddy API is running...');
});
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (req, res) => res.json({ status: 'ready' }));

// Health check endpoint for Render
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * 8.5 Authenticated file serving
 * Replaces public express.static -- files at /uploads/:filename now require
 * a valid auth cookie. See controllers/fileController.js for details.
 */
app.use('/uploads', require('./routes/fileRoutes'));

// 9. Mount routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/auth/google', require('./routes/googleAuthRoutes'));
app.use('/api/otp', require('./routes/otpRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/match', require('./routes/matchRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/report', require('./routes/reportRoutes'));
app.use('/api/password', require('./routes/passwordRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));

// notifications (if present)
try {
  app.use('/api/notifications', require('./routes/notificationRoutes'));
} catch (err) {
  logger.warn({ err }, 'routes.notifications_mount_failed');
}

// NEW: subscription routes
app.use('/api/subscription', require('./routes/subscriptionRoutes'));

// Reading progress routes
app.use('/api/books', require('./routes/bookRoutes'));
app.use('/api/reading-progress', require('./routes/readingProgressRoutes'));
app.use('/api/reading-goals', require('./routes/readingGoalRoutes'));

// Challenge routes
app.use('/api/challenges', require('./routes/challengeRoutes'));

// Club routes
app.use('/api/clubs', require('./routes/clubRoutes'));
app.use('/api/group-chats', require('./routes/groupChatRoutes'));

// Google Books integration routes
app.use('/api/googlebooks', require('./routes/googleBooksRoutes'));
app.use('/api/goodreads', require('./routes/goodreadsRoutes'));

// Import the review routes
const reviewRoutes = require('./routes/reviewRoutes');

// Use the review routes
app.use('/api/reviews', reviewRoutes);

// Mount admin routes for user management and suspension
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/content', require('./routes/adminContentRoutes'));
app.use('/api/admin/support', require('./routes/adminSupportRoutes'));

// 10. Error handling middlewares
app.use(notFound);
app.use(errorHandler);

// 11. Start the HTTP server and wire realtime layer (prefer STOMP util if present, fallback to socket.io)
const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

try {
  let realtimeInitialized = false;

  // Use STOMP broker
  try {
    const stompBroker = require('./utils/stompBroker');
    if (stompBroker) {
      const verifyTokenFn = async (rawToken) => {
        try {
          if (!rawToken) return null;
          let token = rawToken;
          if (typeof token === 'string' && token.startsWith('Bearer ')) {
            token = token.split(' ')[1];
          }
          if (authUtils && typeof authUtils.verifyTokenForSocket === 'function') {
            return await authUtils.verifyTokenForSocket(token);
          }
          // fallback basic jwt verification
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const User = require('./models/userModel');
          const user = await User.findById(decoded.id).select('-password');
          return user || null;
        } catch (e) {
          return null;
        }
      };

      const stomp = stompBroker.initServer(server, { 
        verifyToken: verifyTokenFn, 
        allowedOrigins: ALLOWED 
      });
      app.set('stomp', stomp);
      logger.info('realtime.stomp_initialized');
      realtimeInitialized = true;
    }
  } catch (stompErr) {
    logger.warn({ err: stompErr }, 'realtime.stomp_init_failed');
  }

  if (!realtimeInitialized) {
    // Fallback to legacy Socket.IO helper (keeps existing behavior unchanged)
    try {
      const io = socketUtil.initIO(server);

      // Expose io on the app so controllers/services can use req.app.get('io') if needed
      app.set('io', io);

      // Socket auth using JWT (optional)
      io.use((socket, next) => {
        try {
          const token = socket.handshake.auth && socket.handshake.auth.token;
          if (!token) return next();
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.id;
          return next();
        } catch (err) {
          return next();
        }
      });

      io.on('connection', (socket) => {
        if (socket.userId) {
          socket.join(String(socket.userId));
          logger.debug({ userId: String(socket.userId) }, 'realtime.socket_connected');
        } else {
          logger.debug('realtime.socket_connected_anonymous');
        }
        socket.on('disconnect', () => {});
      });

      logger.info('realtime.socket_io_initialized');
    } catch (ioErr) {
      logger.warn({ err: ioErr }, 'realtime.socket_io_init_failed');
    }
  }
} catch (err) {
  logger.warn({ err }, 'realtime.initialization_failed');
}

server.listen(PORT, () => {
  logger.info(
    { mode: process.env.NODE_ENV || 'development', port: Number(PORT) },
    'server.started'
  );
});
