const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeReadingStatus } = require('../utils/readingStatus');

test('normalizeReadingStatus maps legacy reading to currently-reading', () => {
  assert.equal(normalizeReadingStatus('reading'), 'currently-reading');
  assert.equal(normalizeReadingStatus('currently-reading'), 'currently-reading');
});

test('normalizeReadingStatus uses default when input is empty', () => {
  assert.equal(normalizeReadingStatus(undefined, { defaultStatus: 'want-to-read' }), 'want-to-read');
});

test('normalizeReadingStatus throws for unsupported status', () => {
  assert.throws(() => normalizeReadingStatus('in-progress'));
});
