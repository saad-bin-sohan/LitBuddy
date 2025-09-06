// backend/server.js

// 1. Import core packages
const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); // <-- added for parsing httpOnly cookies

// 2. Import custom modules
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const socketUtil = require('./utils/socket'); // legacy socket.io helper (kept for fallback)
const upload = require('./middleware/uploadMiddleware'); // for serving /uploads

// 2.5 Optional auth utils (we will use verify helper if present)
let authUtils = null;
try {
  authUtils = require('./middleware/authMiddleware');
} catch (err) {
  // If for some reason auth middleware isn't resolvable yet, we'll fallback to inline JWT verification.
  authUtils = null;
}

// 3. Load environment variables
dotenv.config();

// 4. Connect to MongoDB
connectDB();

// 5. Initialize Express app
const app = express();

// Trust proxy (useful behind nginx/railway/vercel proxies)
app.set('trust proxy', true);

// 6. Middleware to parse incoming JSON (increased limit for base64 image uploads)
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ limit: '12mb', extended: true }));

// Parse cookies so we can read httpOnly cookies in middleware/controllers
app.use(cookieParser());

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
app.options('*', cors(corsOptions)); // handle preflight for all routes

// Extra safety: set headers explicitly and be origin-aware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED.has(origin) || isLocalhostOrigin(origin)) {
    // Echo back exact origin to satisfy credentials
    res.header('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

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
 * 8.5 Serve uploaded evidence
 * Files saved by multer go into upload.UPLOADS_DIR (middleware/uploadMiddleware.js)
 * Expose them at /uploads/...
 */
app.use(
  '/uploads',
  express.static(upload.UPLOADS_DIR, {
    setHeaders(res) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// 9. Mount routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/auth/google', require('./routes/googleAuthRoutes'));
app.use('/api/otp', require('./routes/otpRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/match', require('./routes/matchRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/report', require('./routes/reportRoutes'));
app.use('/api/password', require('./routes/passwordRoutes'));

// notifications (if present)
try {
  app.use('/api/notifications', require('./routes/notificationRoutes'));
} catch (err) {
  // route might not exist yet — ignore
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

// Import the review routes
const reviewRoutes = require('./routes/reviewRoutes');

// Use the review routes
app.use('/api/reviews', reviewRoutes);

// Mount admin routes for user management and suspension
app.use('/api/admin', require('./routes/adminRoutes'));

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
      console.log('Realtime: STOMP broker initialized');
      realtimeInitialized = true;
    }
  } catch (stompErr) {
    console.debug('STOMP broker init failed:', stompErr?.message);
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
          console.log(`Socket connected: user ${socket.userId}`);
        } else {
          console.log('Socket connected (anonymous)');
        }
        socket.on('disconnect', () => {});
      });

      console.log('Realtime: Socket.IO initialized (legacy path)');
    } catch (ioErr) {
      console.warn('Socket.IO failed to initialize; continuing without realtime.', ioErr);
    }
  }
} catch (err) {
  console.warn('Realtime not initialized (continuing without realtime).', err);
}

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});