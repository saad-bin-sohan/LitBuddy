const crypto = require('crypto');
const pinoHttp = require('pino-http');
const { logger, sanitizeForLogs } = require('../utils/logger');

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '';
}

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

const pinoHttpMiddleware = pinoHttp({
  logger,
  autoLogging: false,
  genReqId(req, res) {
    const incomingRequestId = req.headers['x-request-id'];
    const requestId = incomingRequestId ? String(incomingRequestId).trim() : generateRequestId();
    res.setHeader('X-Request-Id', requestId);
    return requestId;
  },
});

function requestContext(req, res, next) {
  pinoHttpMiddleware(req, res, () => {
    req.requestId = req.id || req.requestId || generateRequestId();
    req.log = (req.log || logger).child({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      ip: getClientIp(req),
      userAgent: sanitizeForLogs(req.headers['user-agent'] || '', { maxDepth: 1 }),
    });
    next();
  });
}

module.exports = requestContext;
