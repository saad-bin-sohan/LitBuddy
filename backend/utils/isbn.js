const ISBN_CANONICAL_REGEX = /^(?:\d{9}[\dX]|\d{13})$/;

const normalizeIsbn = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).replace(/[\s-]/g, '').toUpperCase();
  return normalized || undefined;
};

const isValidNormalizedIsbn = (value) => {
  if (value === undefined || value === null || value === '') return true;
  return ISBN_CANONICAL_REGEX.test(String(value));
};

module.exports = {
  ISBN_CANONICAL_REGEX,
  normalizeIsbn,
  isValidNormalizedIsbn,
};
