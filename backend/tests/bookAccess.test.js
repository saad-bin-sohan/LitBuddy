const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { canReadBook, sanitizeBookForUser } = require('../utils/bookAccess');

test('private books are readable only by owner', () => {
  const ownerId = new mongoose.Types.ObjectId();
  const otherId = new mongoose.Types.ObjectId();
  const privateBook = {
    createdBy: ownerId,
    visibility: 'private',
    isArchived: false,
  };

  assert.equal(canReadBook(privateBook, { _id: ownerId }), true);
  assert.equal(canReadBook(privateBook, { _id: otherId }), false);
});

test('sanitizeBookForUser hides owner fields for non-owner readers', () => {
  const ownerId = new mongoose.Types.ObjectId();
  const book = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Test',
    createdBy: ownerId,
    mergedInto: new mongoose.Types.ObjectId(),
    visibility: 'public',
    isArchived: false,
  };

  const sanitized = sanitizeBookForUser(book, { _id: new mongoose.Types.ObjectId() });
  assert.equal(sanitized.createdBy, undefined);
  assert.equal(sanitized.mergedInto, undefined);
});
