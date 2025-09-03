// backend/middleware/uploadMiddleware.js
/**
 * Upload middleware (improved)
 *
 * - Disk storage by default (UPLOADS_DIR)
 * - Validates file size and mime types (ALLOWED_FILE_TYPES)
 * - Sanitizes filenames and generates unique names
 * - Normalizes upload metadata into req.savedFiles (array)
 * - Provides helper to remove files if you need rollback
 *
 * ENV supported:
 *  - UPLOADS_DIR (default: ./backend/uploads)
 *  - UPLOADS_BASE_URL (default: /uploads) -> used to form public URLs
 *  - MAX_FILE_SIZE (default: 8MB)
 *  - ALLOWED_FILE_TYPES (comma-separated list, default images + pdf)
 *  - MAX_FILES_PER_FIELD (optional default used by route-level code)
 *
 * Usage (routes):
 *   const upload = require('../middleware/uploadMiddleware');
 *   router.post('/', protect, upload.array('evidence', 5), submitReport);
 *
 * Controllers will find:
 *   - req.files (what multer provides)
 *   - req.savedFiles (normalized array of { fieldname, originalname, filename, path, size, mimetype, url })
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '..', 'uploads');
const UPLOADS_BASE_URL = (process.env.UPLOADS_BASE_URL || '/uploads').replace(/\/+$/, ''); // no trailing slash
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || String(8 * 1024 * 1024), 10); // bytes
const ALLOWED_FILE_TYPES_RAW = process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,image/gif,application/pdf';
const ALLOWED_FILE_TYPES = ALLOWED_FILE_TYPES_RAW.split(',').map((t) => t.trim()).filter(Boolean);

// ensure uploads dir exists
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  // ignore if already exists; let errors surface when writing
}

/**
 * Safe filename generator
 * - preserves extension when possible
 * - removes unsafe characters
 * - caps length
 */
function safeFilename(originalName = '') {
  const extRaw = path.extname(originalName || '') || '';
  const baseRaw = (path.basename(originalName || '', extRaw) || 'file')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_\.]/g, '') // allow - _ .
    .slice(0, 100);
  const rand = crypto.randomBytes(6).toString('hex');
  const ts = Date.now();
  // ensure extension is safe (strip weird characters)
  const ext = extRaw.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
  return `${ts}-${rand}-${baseRaw}${ext || ''}`;
}

/**
 * Quick mapping for fallback extension by mime type (used if original ext missing)
 * Keep small; add more if you expect other mimetypes.
 */
const MIME_EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

/**
 * Determine if a mime type is allowed.
 * Supports exact matches and wildcard 'image/*' style entries in ALLOWED_FILE_TYPES.
 */
function isAllowedMime(mimetype) {
  if (!mimetype) return false;
  if (ALLOWED_FILE_TYPES.includes(mimetype)) return true;
  const [type] = mimetype.split('/');
  if (!type) return false;
  // check wildcard entries in ALLOWED_FILE_TYPES (e.g. image/*)
  return ALLOWED_FILE_TYPES.some((allowed) => {
    if (allowed.endsWith('/*')) {
      const major = allowed.split('/')[0];
      return major === type;
    }
    return false;
  });
}

/**
 * multer storage config
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // original name may not have extension; pick from mimetype fallback
    const original = file.originalname || 'upload.bin';
    let filename = safeFilename(original);
    if (!path.extname(filename)) {
      const ext = MIME_EXT_MAP[file.mimetype] || '';
      if (ext) filename += ext;
    }
    cb(null, filename);
  },
});

const multerOptions = {
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    // Note: per-field file count should be enforced at the route with uploader.array(field, n)
  },
  fileFilter: (req, file, cb) => {
    try {
      if (!file || !file.mimetype) {
        return cb(new Error('Invalid file upload'), false);
      }
      if (!isAllowedMime(file.mimetype)) {
        return cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
      }
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  },
};

const multerInstance = multer(multerOptions);

/**
 * Remove paths helper (async)
 * files: array of { path } or array of string paths
 */
async function removeFiles(files = []) {
  const arr = Array.isArray(files) ? files : [];
  const unlinkPromises = arr.map(async (f) => {
    const p = (typeof f === 'string') ? f : f.path || f.filename || null;
    if (!p) return;
    try {
      const full = path.isAbsolute(p) ? p : path.join(UPLOADS_DIR, p);
      await fs.promises.unlink(full).catch(() => {});
    } catch (e) {
      // swallow - deletion is best-effort
    }
  });
  await Promise.all(unlinkPromises);
}

/**
 * Normalize results from multer and attach req.savedFiles = [ ...normalized objects... ]
 * Normalized object:
 *   { fieldname, originalname, filename, path, size, mimetype, url }
 */
function normalizeSavedFiles(req) {
  const saved = [];
  // multer places files in req.file (single), req.files (array) or req.files (object for fields)
  if (req.file) {
    const f = req.file;
    saved.push(normalizeOne(f));
  } else if (Array.isArray(req.files)) {
    req.files.forEach((f) => saved.push(normalizeOne(f)));
  } else if (req.files && typeof req.files === 'object') {
    // fields: object where keys -> arrays
    Object.values(req.files).forEach((arr) => {
      if (Array.isArray(arr)) arr.forEach((f) => saved.push(normalizeOne(f)));
    });
  }

  // attach to req for controller convenience (keep multer's req.files as-is)
  req.savedFiles = saved;
  return saved;
}

function normalizeOne(f) {
  const filename = f.filename || path.basename(f.path || '');
  const fullPath = f.path || (UPLOADS_DIR ? path.join(UPLOADS_DIR, filename) : filename);
  const url = `${UPLOADS_BASE_URL}/${encodeURIComponent(filename)}`;
  return {
    fieldname: f.fieldname,
    originalname: f.originalname,
    filename,
    path: fullPath,
    size: f.size,
    mimetype: f.mimetype,
    url,
  };
}

/**
 * Wrapper that runs a multer middleware and then normalizes files into req.savedFiles.
 * Behavior:
 *  - On multer errors: respond with 400 JSON (message) by default
 *  - If you prefer to let your global error handler handle it, you can change wrapUploader to call next(err)
 */
function wrapUploader(mw) {
  return (req, res, next) => {
    mw(req, res, async (err) => {
      if (err) {
        // translate multer errors into friendly JSON
        if (err instanceof multer.MulterError) {
          // common multer errors: LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, etc.
          const msg = err.message || 'File upload error';
          return res.status(400).json({ message: msg, code: err.code || 'MULTER_ERROR' });
        }
        // unknown error
        return res.status(400).json({ message: err.message || 'File upload error' });
      }

      try {
        normalizeSavedFiles(req);
        return next();
      } catch (norErr) {
        // if normalization fails, attempt to remove newly saved files
        try { await removeFiles((req.savedFiles || []).map((f) => f.path)); } catch (_) {}
        return res.status(500).json({ message: 'Failed to process uploaded files' });
      }
    });
  };
}

/**
 * Convenience wrappers for route usage
 *   upload.single(field)
 *   upload.array(field, maxCount)
 *   upload.fields([{ name: 'evidence', maxCount: 5 }])
 */
const upload = {
  single: (fieldName) => wrapUploader(multerInstance.single(fieldName)),
  array: (fieldName, maxCount = 5) => wrapUploader(multerInstance.array(fieldName, maxCount)),
  fields: (fieldsDef) => wrapUploader(multerInstance.fields(fieldsDef)),
  multerInstance,
  UPLOADS_DIR,
  UPLOADS_BASE_URL,
  removeFiles,       // useful in controllers to rollback
  normalizeSavedFiles,
};

module.exports = upload;
