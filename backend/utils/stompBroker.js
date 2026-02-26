const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { logger } = require('./logger');
const { AUTH_COOKIE_NAME } = require('../config/authCookie');

const MAX_BUFFER_SIZE = 1024 * 1024;

let wss = null;
let connections = new Map();
let subscriptions = new Map();
let nextConnectionId = 0;
let nextMessageId = 0;

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

function toUtf8String(data) {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  }
  return String(data || '');
}

function unescapeHeaderValue(value) {
  return String(value)
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\c/g, ':')
    .replace(/\\\\/g, '\\');
}

function parseStompFrame(rawFrame) {
  const crlfDelimiterIndex = rawFrame.indexOf('\r\n\r\n');
  const lfDelimiterIndex = rawFrame.indexOf('\n\n');

  let delimiterIndex = -1;
  let delimiterLength = 0;

  if (crlfDelimiterIndex >= 0 && (lfDelimiterIndex < 0 || crlfDelimiterIndex < lfDelimiterIndex)) {
    delimiterIndex = crlfDelimiterIndex;
    delimiterLength = 4;
  } else if (lfDelimiterIndex >= 0) {
    delimiterIndex = lfDelimiterIndex;
    delimiterLength = 2;
  }

  const headerPart = delimiterIndex >= 0 ? rawFrame.slice(0, delimiterIndex) : rawFrame;
  let bodyPart = delimiterIndex >= 0 ? rawFrame.slice(delimiterIndex + delimiterLength) : '';

  const headerLines = headerPart.split(/\r?\n/);
  const command = (headerLines.shift() || '').trim().toUpperCase();
  if (!command) {
    throw new Error('STOMP frame missing command');
  }

  const headers = {};
  for (const line of headerLines) {
    if (!line) continue;
    const sep = line.indexOf(':');
    if (sep <= 0) continue;

    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1);
    if (!key) continue;

    headers[key] = unescapeHeaderValue(value);
  }

  const contentLength = Number.parseInt(headers['content-length'], 10);
  if (Number.isFinite(contentLength) && contentLength >= 0) {
    bodyPart = bodyPart.slice(0, contentLength);
  }

  return { command, headers, body: bodyPart };
}

function serializeStompFrame(command, headers = {}, body = '') {
  const normalizedBody = body == null ? '' : String(body);
  const normalizedHeaders = {};

  for (const [key, value] of Object.entries(headers || {})) {
    if (value === undefined || value === null) continue;
    normalizedHeaders[key] = String(value);
  }

  if (normalizedBody && normalizedHeaders['content-length'] == null) {
    normalizedHeaders['content-length'] = String(Buffer.byteLength(normalizedBody, 'utf8'));
  }

  let frame = `${command}\n`;
  for (const [key, value] of Object.entries(normalizedHeaders)) {
    frame += `${key}:${value}\n`;
  }
  frame += `\n${normalizedBody}\0`;

  return frame;
}

function sendFrame(ws, command, headers = {}, body = '') {
  try {
    ws.send(serializeStompFrame(command, headers, body));
  } catch (err) {
    logger.error({ err, command }, 'stomp.frame_send_failed');
  }
}

function getConnection(connectionId) {
  return connections.get(connectionId) || null;
}

function isWebSocketOpen(ws) {
  return ws && ws.readyState === WebSocket.OPEN;
}

function nextConnectionKey() {
  nextConnectionId += 1;
  return `conn-${Date.now()}-${nextConnectionId}`;
}

function nextMessageKey() {
  nextMessageId += 1;
  return `msg-${Date.now()}-${nextMessageId}`;
}

function selectProtocolVersion(acceptVersion = '') {
  const raw = String(acceptVersion || '').trim();
  if (!raw) return '1.2';

  const versions = raw.split(',').map((v) => v.trim());
  if (versions.includes('1.2')) return '1.2';
  if (versions.includes('1.1')) return '1.1';
  if (versions.includes('1.0')) return '1.0';
  return '1.2';
}

function addSubscription(destination, connectionId, subscriptionId) {
  if (!subscriptions.has(destination)) {
    subscriptions.set(destination, new Map());
  }

  const destinationSubs = subscriptions.get(destination);
  if (!destinationSubs.has(connectionId)) {
    destinationSubs.set(connectionId, new Set());
  }

  destinationSubs.get(connectionId).add(subscriptionId);

  const connection = getConnection(connectionId);
  if (connection) {
    connection.subscriptionsById.set(subscriptionId, destination);
  }
}

function removeDestinationSubscription(destination, connectionId, subscriptionId) {
  const destinationSubs = subscriptions.get(destination);
  if (!destinationSubs) return;

  const connectionSubs = destinationSubs.get(connectionId);
  if (!connectionSubs) return;

  connectionSubs.delete(subscriptionId);
  if (connectionSubs.size === 0) {
    destinationSubs.delete(connectionId);
  }

  if (destinationSubs.size === 0) {
    subscriptions.delete(destination);
  }
}

function removeSubscriptionById(connectionId, subscriptionId) {
  const connection = getConnection(connectionId);
  if (!connection) return;

  const destination = connection.subscriptionsById.get(subscriptionId);
  if (!destination) return;

  removeDestinationSubscription(destination, connectionId, subscriptionId);
  connection.subscriptionsById.delete(subscriptionId);
}

function cleanupConnectionSubscriptions(connectionId) {
  const connection = getConnection(connectionId);
  if (!connection) return;

  for (const subscriptionId of connection.subscriptionsById.keys()) {
    removeSubscriptionById(connectionId, subscriptionId);
  }
}

function sendReceiptIfRequested(connection, frame) {
  const receipt = frame.headers && frame.headers.receipt;
  if (!receipt) return;

  sendFrame(connection.ws, 'RECEIPT', {
    'receipt-id': receipt,
  });
}

function sendError(connection, message, details = '') {
  sendFrame(
    connection.ws,
    'ERROR',
    {
      message,
      'content-type': 'text/plain',
    },
    details
  );
}

function handleConnect(connection, frame) {
  if (connection.connected) {
    sendError(connection, 'CONNECT ERROR', 'Connection already established');
    return;
  }

  const version = selectProtocolVersion(frame.headers['accept-version']);
  connection.connected = true;
  connection.version = version;

  sendFrame(connection.ws, 'CONNECTED', {
    version,
    server: 'LitBuddy-STOMP/1.0',
    'heart-beat': '0,0',
    session: String(connection.id),
  });
}

function handleSubscribe(connection, frame) {
  if (!connection.connected) {
    sendError(connection, 'SUBSCRIBE ERROR', 'Client must CONNECT before SUBSCRIBE');
    return;
  }

  const destination = frame.headers.destination;
  if (!destination) {
    sendError(connection, 'SUBSCRIBE ERROR', 'Missing destination header');
    return;
  }

  const subscriptionId =
    frame.headers.id || `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  addSubscription(destination, connection.id, subscriptionId);
  sendReceiptIfRequested(connection, frame);

  logger.debug(
    { userId: String(connection.userId), destination, subscriptionId },
    'stomp.subscription_added'
  );
}

function handleUnsubscribe(connection, frame) {
  const subscriptionId = frame.headers.id;
  if (!subscriptionId) {
    sendError(connection, 'UNSUBSCRIBE ERROR', 'Missing id header');
    return;
  }

  removeSubscriptionById(connection.id, subscriptionId);
  sendReceiptIfRequested(connection, frame);
}

function handleSend(connection, frame) {
  logger.debug(
    {
      userId: String(connection.userId),
      destination: frame.headers.destination,
    },
    'stomp.message_received'
  );

  sendReceiptIfRequested(connection, frame);
}

function handleDisconnect(connection, frame) {
  sendReceiptIfRequested(connection, frame);
  if (isWebSocketOpen(connection.ws)) {
    connection.ws.close(1000, 'Client disconnected');
  }
}

function handleFrame(connection, frame) {
  switch (frame.command) {
    case 'CONNECT':
    case 'STOMP':
      handleConnect(connection, frame);
      break;
    case 'SUBSCRIBE':
      handleSubscribe(connection, frame);
      break;
    case 'UNSUBSCRIBE':
      handleUnsubscribe(connection, frame);
      break;
    case 'SEND':
      handleSend(connection, frame);
      break;
    case 'DISCONNECT':
      handleDisconnect(connection, frame);
      break;
    default:
      sendError(connection, 'COMMAND ERROR', `Unsupported command: ${frame.command}`);
      break;
  }
}

function processIncomingData(connectionId, data) {
  const connection = getConnection(connectionId);
  if (!connection) return;

  connection.buffer += toUtf8String(data);

  if (connection.buffer.length > MAX_BUFFER_SIZE) {
    logger.warn({ connectionId }, 'stomp.connection_buffer_too_large');
    connection.ws.close(1009, 'Frame too large');
    return;
  }

  while (connection.buffer.startsWith('\n') || connection.buffer.startsWith('\r')) {
    connection.buffer = connection.buffer.slice(1);
  }

  while (true) {
    const frameEnd = connection.buffer.indexOf('\0');
    if (frameEnd < 0) break;

    const rawFrame = connection.buffer.slice(0, frameEnd);
    connection.buffer = connection.buffer.slice(frameEnd + 1);

    while (connection.buffer.startsWith('\n') || connection.buffer.startsWith('\r')) {
      connection.buffer = connection.buffer.slice(1);
    }

    if (!rawFrame.trim()) continue;

    try {
      const frame = parseStompFrame(rawFrame);
      handleFrame(connection, frame);
    } catch (err) {
      logger.error({ err, connectionId }, 'stomp.frame_parse_failed');
      sendError(connection, 'FRAME PARSE ERROR', 'Invalid STOMP frame');
    }
  }
}

function resetBrokerState() {
  connections = new Map();
  subscriptions = new Map();
  nextConnectionId = 0;
  nextMessageId = 0;
}

function initServer(server, options = {}) {
  const allowedOrigins = new Set(Array.from(options.allowedOrigins || []));
  const verifyToken =
    typeof options.verifyToken === 'function' ? options.verifyToken : defaultVerifyToken;

  if (wss) {
    try {
      wss.close();
    } catch (err) {
      logger.debug({ err }, 'stomp.previous_server_close_failed');
    }
    wss = null;
  }

  resetBrokerState();

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
    const connectionId = nextConnectionKey();
    const userId = req.userId;

    const connection = {
      id: connectionId,
      ws,
      userId,
      version: '1.2',
      connected: false,
      subscriptionsById: new Map(),
      buffer: '',
    };

    connections.set(connectionId, connection);

    logger.info({ userId: String(userId) }, 'stomp.websocket_connected');

    ws.on('message', (data) => {
      processIncomingData(connectionId, data);
    });

    ws.on('close', () => {
      logger.info({ userId: String(userId) }, 'stomp.websocket_disconnected');
      cleanupConnectionSubscriptions(connectionId);
      connections.delete(connectionId);
    });

    ws.on('error', (err) => {
      logger.error({ err, userId: String(userId) }, 'stomp.websocket_error');
    });
  });

  return { wss, publish };
}

function publish(destination, body, headers = {}) {
  if (!wss) {
    logger.warn({ destination }, 'stomp.publish_skipped_not_initialized');
    return;
  }

  const destinationSubs = subscriptions.get(destination);
  if (!destinationSubs || destinationSubs.size === 0) return;

  const isBodyString = typeof body === 'string';
  const messageBody = isBodyString ? body : JSON.stringify(body);
  const contentType = headers['content-type'] || (isBodyString ? 'text/plain' : 'application/json');

  destinationSubs.forEach((subscriptionIds, connectionId) => {
    const connection = getConnection(connectionId);
    if (!connection || !isWebSocketOpen(connection.ws) || !connection.connected) return;

    subscriptionIds.forEach((subscriptionId) => {
      const frameHeaders = {
        destination,
        subscription: subscriptionId,
        'message-id': nextMessageKey(),
        'content-type': contentType,
        ...headers,
      };

      try {
        sendFrame(connection.ws, 'MESSAGE', frameHeaders, messageBody);
      } catch (err) {
        logger.error({ err, destination }, 'stomp.publish_send_failed');
      }
    });
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
