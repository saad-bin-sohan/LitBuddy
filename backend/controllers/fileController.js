// backend/controllers/fileController.js
//
// Authenticated file serving -- replaces the public express.static mount.
// Requires a valid auth cookie (protect middleware on the route).
// Any authenticated user may access any uploaded file; filenames already
// include timestamp + 6 random hex bytes, making them non-enumerable.
//
// Security:
//  - Validates filename to block path traversal attacks (no .., /, \)
//  - Resolves the absolute path and confirms it starts with UPLOADS_DIR
//  - Returns 404 (not 403) for missing files to avoid leaking directory info
//  - Sets X-Content-Type-Options: nosniff on all responses

const path = require('path');
const fs = require('fs');
const asyncHandler = require('express-async-handler');
const upload = require('../middleware/uploadMiddleware');

const SAFE_FILENAME_RE = /^[a-zA-Z0-9\-_.%]+$/;

const serveFile = asyncHandler(async (req, res) => {
  const raw = req.params.filename;

  // 1. Reject obviously invalid or missing filenames
  if (!raw || !SAFE_FILENAME_RE.test(raw)) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  // 2. URL-decode (multer uses encodeURIComponent on stored URLs)
  let filename;
  try {
    filename = decodeURIComponent(raw);
  } catch {
    return res.status(400).json({ message: 'Invalid filename encoding' });
  }

  // 3. Reject any decoded value that tries path traversal
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    path.isAbsolute(filename)
  ) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  // 4. Build and resolve the absolute path
  const uploadsDir = path.resolve(upload.UPLOADS_DIR);
  const filePath = path.resolve(path.join(uploadsDir, filename));

  // 5. Confirm the resolved path stays within UPLOADS_DIR
  //    (belt-and-suspenders guard against any edge case in the above)
  if (!filePath.startsWith(uploadsDir + path.sep) && filePath !== uploadsDir) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  // 6. Check the file actually exists
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({ message: 'File not found' });
  }

  // 7. Serve it -- Express resolves Content-Type from extension
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: 'Failed to serve file' });
    }
  });
});

module.exports = { serveFile };
