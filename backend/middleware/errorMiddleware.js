// backend/middleware/errorMiddleware.js
const { getLogger } = require('../utils/logger');

// Handle 404 - Route Not Found
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Handle general server errors
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const requestLogger = getLogger(req);

  if (!err._alreadyLogged) {
    const logPayload = {
      requestId: req.requestId,
      statusCode,
      method: req.method,
      path: req.originalUrl || req.url,
      errorName: err.name,
      errorCode: err.code,
      err,
    };

    if (statusCode >= 500) {
      requestLogger.error(logPayload, 'http.error_handler');
    } else {
      requestLogger.warn(logPayload, 'http.error_handler');
    }
    err._alreadyLogged = true;
  }

  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
