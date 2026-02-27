const ALLOWED_READING_STATUSES = ['want-to-read', 'currently-reading', 'completed', 'dnf'];
const ALLOWED_READING_STATUS_SET = new Set(ALLOWED_READING_STATUSES);

const normalizeReadingStatus = (value, { defaultStatus = 'want-to-read' } = {}) => {
  if (value === undefined || value === null || value === '') {
    return defaultStatus;
  }

  const raw = String(value).trim().toLowerCase();
  const canonical = raw === 'reading' ? 'currently-reading' : raw;

  if (!ALLOWED_READING_STATUS_SET.has(canonical)) {
    const err = new Error(
      `Invalid reading status. Allowed values: ${ALLOWED_READING_STATUSES.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }

  return canonical;
};

module.exports = {
  ALLOWED_READING_STATUSES,
  normalizeReadingStatus,
};
