const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Book = require('../models/bookModel');

test('book schema keeps a single isbn index and source id indexes', () => {
  const indexes = Book.schema.indexes();

  const isbnIndexes = indexes.filter(([spec]) => JSON.stringify(spec) === JSON.stringify({ isbn: 1 }));
  assert.equal(isbnIndexes.length, 1);
  assert.equal(Boolean(isbnIndexes[0][1] && isbnIndexes[0][1].sparse), true);

  const goodreadsSourceIndex = indexes.find(
    ([spec]) =>
      JSON.stringify(spec) === JSON.stringify({ createdBy: 1, goodreadsId: 1 })
  );
  assert.ok(goodreadsSourceIndex);
  assert.equal(goodreadsSourceIndex[1].unique, true);

  const googleSourceIndex = indexes.find(
    ([spec]) =>
      JSON.stringify(spec) === JSON.stringify({ createdBy: 1, googleBooksId: 1 })
  );
  assert.ok(googleSourceIndex);
  assert.equal(googleSourceIndex[1].unique, true);
});

test('book schema normalizes isbn and rejects invalid normalized values', () => {
  const userId = new mongoose.Types.ObjectId();

  const validBook = new Book({
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    isbn: '978-0-13-449416-6',
    createdBy: userId,
  });

  assert.equal(validBook.isbn, '9780134494166');

  const invalidBook = new Book({
    title: 'Invalid ISBN',
    author: 'Author',
    isbn: 'ABC-123',
    createdBy: userId,
  });

  const validationError = invalidBook.validateSync();
  assert.ok(validationError);
  assert.ok(validationError.errors.isbn);
});
