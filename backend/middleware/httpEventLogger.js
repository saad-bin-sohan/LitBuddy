const { getLogger, summarizeObject, sanitizeForLogs } = require('../utils/logger');

const LOG_HTTP_SLOW_MS = Number.parseInt(process.env.LOG_HTTP_SLOW_MS || '1500', 10);

function getUserId(req) {
  if (!req || !req.user) return undefined;
  return req.user._id || req.user.id;
}

function roundedDuration(durationMs) {
  return Math.round(durationMs * 100) / 100;
}

function buildHttpContext(req, res, durationMs) {
  const context = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl || req.url,
    statusCode: res.statusCode,
    durationMs: roundedDuration(durationMs),
    userId: getUserId(req),
  };

  if (req.params && Object.keys(req.params).length > 0) {
    context.params = sanitizeForLogs(req.params, { maxDepth: 2 });
  }

  if (req.query && Object.keys(req.query).length > 0) {
    context.query = summarizeObject(req.query, { maxDepth: 2 });
  }

  if (req.body && Object.keys(req.body).length > 0) {
    context.body = summarizeObject(req.body, { maxDepth: 2 });
  }

  return context;
}

function httpEventLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const requestLogger = getLogger(req);
    const context = buildHttpContext(req, res, durationMs);

    if (res.statusCode >= 500) {
      requestLogger.error(context, 'http.server_error');
      return;
    }

    if (res.statusCode >= 400) {
      requestLogger.warn(context, 'http.client_error');
      return;
    }

    if (durationMs >= LOG_HTTP_SLOW_MS) {
      requestLogger.warn(
        {
          ...context,
          slowThresholdMs: LOG_HTTP_SLOW_MS,
        },
        'http.slow_request'
      );
    }
  });

  next();
}

module.exports = httpEventLogger;
