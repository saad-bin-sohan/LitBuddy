const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeIsbn } = require('../utils/isbn');

test('normalizeIsbn strips spaces and dashes for ISBN-13', () => {
  const normalized = normalizeIsbn('978-0-545-01022-1');
  assert.equal(normalized, '9780545010221');
});

test('normalizeIsbn preserves uppercase X for ISBN-10', () => {
  const normalized = normalizeIsbn('0-8044-2957-x');
  assert.equal(normalized, '080442957X');
});

test('normalizeIsbn returns empty string for invalid values', () => {
  assert.equal(normalizeIsbn('invalid-isbn'), '');
  assert.equal(normalizeIsbn(null), '');
});
