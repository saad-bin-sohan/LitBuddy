// backend/middleware/csrfMiddleware.js
//
// Custom-header CSRF defense.
// State-changing endpoints (POST, PUT, PATCH, DELETE) must include the
// X-Requested-With header. Browsers never send this automatically on
// cross-origin requests, so its presence proves the request originated
// from our own JavaScript code.
//
// Exempt: GET, HEAD, OPTIONS (safe methods that don't mutate state).
// Exempt: Requests with no origin (server-to-server, Postman, mobile apps
//         — where the null-origin CORS exemption already applies).

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-requested-with';
const CSRF_HEADER_VALUE = 'XMLHttpRequest';

function csrfProtect(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Skip for requests with no Origin header (mobile apps, Postman, curl)
  // These cannot be triggered by a browser-based CSRF attack.
  const origin = req.headers.origin;
  if (!origin) return next();

  const header = req.headers[CSRF_HEADER];
  if (!header || header.toLowerCase() !== CSRF_HEADER_VALUE.toLowerCase()) {
    return res.status(403).json({
      message: 'CSRF check failed. Please use the official LitBuddy client.',
      code: 'CSRF_HEADER_MISSING',
    });
  }

  return next();
}

module.exports = { csrfProtect };
