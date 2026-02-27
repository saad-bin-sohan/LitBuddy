const test = require('node:test');
const assert = require('node:assert/strict');

const { _private } = require('../controllers/readingProgressController');

test('calculateProgressPercentage returns 0 when total pages is zero', () => {
  assert.equal(_private.calculateProgressPercentage(10, 0), 0);
  assert.equal(_private.calculateProgressPercentage(10, null), 0);
});

test('calculateProgressPercentage clamps percentage to 0-100', () => {
  assert.equal(_private.calculateProgressPercentage(50, 100), 50);
  assert.equal(_private.calculateProgressPercentage(150, 100), 100);
  assert.equal(_private.calculateProgressPercentage(-5, 100), 0);
});
