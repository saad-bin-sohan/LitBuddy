function normalizeIsbn(value) {
  if (value === undefined || value === null) return '';

  const cleaned = String(value).trim().replace(/[\s-]+/g, '').toUpperCase();
  if (!cleaned) return '';

  if (/^\d{13}$/.test(cleaned)) return cleaned;
  if (/^\d{9}[\dX]$/.test(cleaned)) return cleaned;

  return '';
}

module.exports = {
  normalizeIsbn,
};
