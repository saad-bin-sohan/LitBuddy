const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { logger } = require('./logger');
const { AUTH_COOKIE_NAME } = require('../config/authCookie');

let wss = null;
let connections = new Map();
let subscriptions = new Map();

function parseCookieHeader(rawHeader = '') {
  const cookies = {};
  if (!rawHeader || typeof rawHeader !== 'string') return cookies;

  const parts = rawHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...valueParts] = part.split('=');
    const key = (rawKey || '').trim();
    if (!key) continue;
    const value = valueParts.join('=').trim();
    cookies[key] = decodeURIComponent(value || '');
  }
  return cookies;
}

function tokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie || '');
  if (cookies[AUTH_COOKIE_NAME]) return cookies[AUTH_COOKIE_NAME];
  if (AUTH_COOKIE_NAME !== 'token' && cookies.token) return cookies.token;

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken.trim();
  } catch (err) {
    logger.debug({ err }, 'stomp.token_query_parse_failed');
  }

  return null;
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  if (!allowedOrigins || allowedOrigins.size === 0) return true;
  return allowedOrigins.has(origin);
}

async function defaultVerifyToken(rawToken) {
  if (!rawToken) return null;
  let token = String(rawToken).trim();
  if (!token || token === 'undefined' || token === 'null') return null;
  if (token.startsWith('Bearer ')) token = token.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return null;
    return { _id: decoded.id };
  } catch (err) {
    return null;
  }
}

function initServer(server, options = {}) {
  const allowedOrigins = new Set(Array.from(options.allowedOrigins || []));
  const verifyToken =
    typeof options.verifyToken === 'function' ? options.verifyToken : defaultVerifyToken;

  wss = new WebSocket.Server({
    server,
    path: '/ws',
    verifyClient: (info, done) => {
      const origin = info.req.headers.origin;
      if (!isOriginAllowed(origin, allowedOrigins)) {
        logger.warn({ origin }, 'stomp.origin_rejected');
        return done(false, 403, 'Origin not allowed');
      }

      const token = tokenFromRequest(info.req);
      if (!token) {
        logger.debug('stomp.token_missing');
        return done(false, 401, 'Unauthorized');
      }

      Promise.resolve(verifyToken(token))
        .then((user) => {
          if (!user) return done(false, 401, 'Unauthorized');
          info.req.userId = String(user._id || user.id);
          return done(true);
        })
        .catch((err) => {
          logger.debug({ err }, 'stomp.token_verification_failed');
          return done(false, 401, 'Unauthorized');
        });
    },
  });

  wss.on('connection', (ws, req) => {
    const connectionId = Date.now() + Math.random();
    const userId = req.userId;

    logger.info({ userId: String(userId) }, 'stomp.websocket_connected');

    connections.set(connectionId, {
      ws,
      userId,
      subscriptions: new Set(),
    });

    ws.send(
      JSON.stringify({
        command: 'CONNECTED',
        version: '1.2',
        headers: {
          'heart-beat': '0,0',
          server: 'LitBuddy-STOMP/1.0',
        },
      })
    );

    ws.on('message', (data) => {
      try {
        const frame = JSON.parse(data.toString());
        handleStompFrame(connectionId, frame);
      } catch (err) {
        logger.error({ err, connectionId }, 'stomp.frame_parse_failed');
      }
    });

    ws.on('close', () => {
      logger.info({ userId: String(userId) }, 'stomp.websocket_disconnected');
      const connection = connections.get(connectionId);
      if (connection) {
        connection.subscriptions.forEach((destination) => {
          removeSubscription(destination, connectionId);
        });
      }
      connections.delete(connectionId);
    });

    ws.on('error', (err) => {
      logger.error({ err, userId: String(userId) }, 'stomp.websocket_error');
    });
  });

  return { wss, publish };
}

function handleStompFrame(connectionId, frame) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  switch (frame.command) {
    case 'SUBSCRIBE': {
      const destination = frame.headers.destination;
      if (destination) {
        addSubscription(destination, connectionId);
        logger.debug(
          { userId: String(connection.userId), destination },
          'stomp.subscription_added'
        );
      }
      break;
    }
    case 'SEND':
      logger.debug(
        { userId: String(connection.userId), destination: frame.headers.destination },
        'stomp.message_received'
      );
      break;
    case 'DISCONNECT':
      break;
    default:
      break;
  }
}

function addSubscription(destination, connectionId) {
  if (!subscriptions.has(destination)) {
    subscriptions.set(destination, new Set());
  }
  subscriptions.get(destination).add(connectionId);

  const connection = connections.get(connectionId);
  if (connection) {
    connection.subscriptions.add(destination);
  }
}

function removeSubscription(destination, connectionId) {
  const destSubs = subscriptions.get(destination);
  if (destSubs) {
    destSubs.delete(connectionId);
    if (destSubs.size === 0) {
      subscriptions.delete(destination);
    }
  }
}

function publish(destination, body, headers = {}) {
  if (!wss) {
    logger.warn({ destination }, 'stomp.publish_skipped_not_initialized');
    return;
  }

  const messageBody = typeof body === 'string' ? body : JSON.stringify(body);
  const frame = {
    command: 'MESSAGE',
    headers: {
      destination,
      'content-type': 'application/json',
      'message-id': Date.now() + Math.random(),
      ...headers,
    },
    body: messageBody,
  };

  const destSubs = subscriptions.get(destination);
  if (!destSubs) return;

  destSubs.forEach((connectionId) => {
    const connection = connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(frame));
      } catch (err) {
        logger.error({ err, destination }, 'stomp.publish_send_failed');
      }
    }
  });
}

function getConnectionCount() {
  return connections.size;
}

function getSubscriptionCount() {
  return subscriptions.size;
}

module.exports = {
  initServer,
  publish,
  getConnectionCount,
  getSubscriptionCount,
};
