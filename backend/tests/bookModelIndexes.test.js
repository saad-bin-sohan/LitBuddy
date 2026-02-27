const test = require('node:test');
const assert = require('node:assert/strict');

const Book = require('../models/bookModel');

test('book schema uses normalized isbn index and has no direct isbn index duplication', () => {
  const indexes = Book.schema.indexes();
  const isbnIndexes = indexes.filter(([spec]) => JSON.stringify(spec) === JSON.stringify({ isbn: 1 }));
  const isbnNormalizedIndexes = indexes.filter(
    ([spec]) => JSON.stringify(spec) === JSON.stringify({ isbnNormalized: 1 })
  );

  assert.equal(isbnIndexes.length, 0);
  assert.equal(isbnNormalizedIndexes.length, 1);
});
