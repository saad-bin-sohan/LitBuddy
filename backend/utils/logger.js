const pino = require('pino');

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_REDACTION_MODE = (process.env.LOG_REDACTION_MODE || 'balanced').toLowerCase();
const LOG_STACKS = toBoolean(process.env.LOG_STACKS, true);

const REDACT_CENSOR = '[REDACTED]';
const MAX_STRING_LENGTH = 180;
const MAX_OBJECT_KEYS = 25;
const MAX_ARRAY_ITEMS = 10;

const SENSITIVE_KEY_RE = /(password|token|authorization|cookie|otp|secret|captcha|resetpasswordtoken|resetpasswordexpires|access_token|refresh_token|id_token)/i;
const MASKED_KEY_RE = /(email|phone|identifier|ip)/i;
const BLOBISH_KEY_RE = /(photo|image|avatar|file|attachment|base64|binary|payload|content)/i;

function truncateString(value, maxLength = MAX_STRING_LENGTH) {
  const str = String(value);
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...(truncated,len=${str.length})`;
}

function maskEmail(value) {
  const str = String(value || '');
  const at = str.indexOf('@');
  if (at <= 1) return '***';
  const local = str.slice(0, at);
  const domain = str.slice(at + 1);
  const domainParts = domain.split('.');
  if (!domainParts[0]) return `${local[0]}***@***`;
  return `${local[0]}***@${domainParts[0][0]}***${domainParts.length > 1 ? `.${domainParts.slice(1).join('.')}` : ''}`;
}

function maskPhone(value) {
  const str = String(value || '');
  const digits = str.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function maskIp(value) {
  const str = String(value || '');
  if (str.includes(':')) {
    return `${str.slice(0, 8)}***`;
  }
  const parts = str.split('.');
  if (parts.length !== 4) return truncateString(str, 40);
  return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
}

function maskToken(value) {
  const str = String(value || '');
  if (!str) return '***';
  if (str.length <= 10) return `${str.slice(0, 2)}***`;
  return `${str.slice(0, 6)}...len=${str.length}`;
}

function sanitizePrimitive(key, value, mode) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    const normalizedKey = key || '';

    if (SENSITIVE_KEY_RE.test(normalizedKey)) {
      return REDACT_CENSOR;
    }

    if (BLOBISH_KEY_RE.test(normalizedKey) && value.length > 60) {
      return `[BLOB_TRUNCATED len=${value.length}]`;
    }

    if (MASKED_KEY_RE.test(normalizedKey)) {
      if (/email/i.test(normalizedKey)) return maskEmail(value);
      if (/phone/i.test(normalizedKey)) return maskPhone(value);
      if (/ip/i.test(normalizedKey)) return maskIp(value);
      if (/token/i.test(normalizedKey) || /authorization/i.test(normalizedKey)) return maskToken(value);
      return truncateString(value, 80);
    }

    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      return `[JWT ${maskToken(value)}]`;
    }

    if (mode === 'strict') {
      return `[STRING len=${value.length}]`;
    }

    return truncateString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  return value;
}

function sanitizeForLogs(value, options = {}) {
  const {
    mode = LOG_REDACTION_MODE,
    depth = 0,
    maxDepth = 3,
    maxKeys = MAX_OBJECT_KEYS,
    maxArray = MAX_ARRAY_ITEMS,
    key = '',
  } = options;

  if (value === null || value === undefined) return value;

  if (typeof value !== 'object') {
    return sanitizePrimitive(key, value, mode);
  }

  if (depth >= maxDepth) {
    if (Array.isArray(value)) return `[ARRAY len=${value.length}]`;
    return `[OBJECT keys=${Object.keys(value).length}]`;
  }

  if (Array.isArray(value)) {
    const sliced = value.slice(0, maxArray).map((item) =>
      sanitizeForLogs(item, { mode, depth: depth + 1, maxDepth, maxKeys, maxArray, key })
    );
    if (value.length > maxArray) {
      sliced.push(`[+${value.length - maxArray} more]`);
    }
    return sliced;
  }

  const keys = Object.keys(value);

  if (mode === 'strict') {
    return {
      keys: keys.slice(0, maxKeys),
      keyCount: keys.length,
    };
  }

  const output = {};
  for (const field of keys.slice(0, maxKeys)) {
    output[field] = sanitizeForLogs(value[field], {
      mode,
      depth: depth + 1,
      maxDepth,
      maxKeys,
      maxArray,
      key: field,
    });
  }

  if (keys.length > maxKeys) {
    output.__truncatedKeys = keys.length - maxKeys;
  }

  return output;
}

function summarizeObject(value, options = {}) {
  if (!value || typeof value !== 'object') return undefined;

  const keys = Object.keys(value);
  const sample = {};

  for (const key of keys.slice(0, 20)) {
    sample[key] = value[key];
  }

  return {
    keyCount: keys.length,
    keys: keys.slice(0, 20),
    sample: sanitizeForLogs(sample, options),
  };
}

function getLogger(req) {
  return req && req.log ? req.log : logger;
}

const errSerializer = (err) => {
  if (!err) return err;
  const serialized = pino.stdSerializers.err(err);
  if (!LOG_STACKS && serialized && serialized.stack) {
    delete serialized.stack;
  }
  return serialized;
};

const reqSerializer = (req) => {
  if (!req) return req;
  return {
    id: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    headers: sanitizeForLogs(
      {
        'user-agent': req.headers && req.headers['user-agent'],
        origin: req.headers && req.headers.origin,
        'x-forwarded-for': req.headers && req.headers['x-forwarded-for'],
        authorization: req.headers && req.headers.authorization,
      },
      { maxDepth: 2 }
    ),
  };
};

const resSerializer = (res) => {
  if (!res) return res;
  return {
    statusCode: res.statusCode,
  };
};

const logger = pino({
  level: LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      '*.password',
      '*.token',
      '*.authorization',
      '*.cookie',
      '*.otp',
      '*.secret',
      '*.captcha',
      '*.resetPasswordToken',
      '*.resetPasswordExpires',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.set-cookie',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: REDACT_CENSOR,
  },
  serializers: {
    err: errSerializer,
    req: reqSerializer,
    res: resSerializer,
  },
});

module.exports = {
  logger,
  getLogger,
  sanitizeForLogs,
  summarizeObject,
  LOG_REDACTION_MODE,
  LOG_STACKS,
};
