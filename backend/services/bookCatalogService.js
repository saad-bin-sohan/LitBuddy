const Book = require('../models/bookModel');
const { normalizeIsbn } = require('../utils/isbn');

function toYear(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function toPositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function normalizeLanguage(value) {
  if (!value) return 'English';
  const text = String(value).trim();
  if (!text) return 'English';

  const common = {
    en: 'English',
    english: 'English',
  };
  const mapped = common[text.toLowerCase()];
  return mapped || text;
}

function getProviderFields(source) {
  if (source === 'googlebooks') {
    return {
      idField: 'googleBooksId',
      ratingField: 'googleBooksRating',
      ratingsCountField: 'googleBooksRatingsCount',
    };
  }

  return {
    idField: 'goodreadsId',
    ratingField: 'goodreadsRating',
    ratingsCountField: 'goodreadsRatingsCount',
  };
}

function buildExternalPayload(source, externalBook) {
  const { idField, ratingField, ratingsCountField } = getProviderFields(source);
  const isbn = externalBook.isbn || '';
  const isbnNormalized = normalizeIsbn(isbn);

  return {
    title: externalBook.title || 'Unknown Title',
    author: externalBook.author || 'Unknown Author',
    isbn,
    isbnNormalized,
    coverImage: externalBook.imageUrl || '',
    description: externalBook.description || '',
    genre: Array.isArray(externalBook.categories)
      ? externalBook.categories
      : (Array.isArray(externalBook.genres) ? externalBook.genres : []),
    publishedYear: toYear(externalBook.publicationYear),
    pageCount: toPositiveInt(externalBook.pages || externalBook.pageCount),
    language: normalizeLanguage(externalBook.language),
    isCustom: false,
    [idField]: externalBook[idField] || externalBook.id || null,
    [ratingField]: Number.isFinite(Number(externalBook.averageRating))
      ? Number(externalBook.averageRating)
      : undefined,
    [ratingsCountField]: Number.isFinite(Number(externalBook.ratingsCount))
      ? Number(externalBook.ratingsCount)
      : undefined,
  };
}

function mergeBookMetadata(book, payload) {
  const scalarKeys = [
    'title',
    'author',
    'isbn',
    'isbnNormalized',
    'coverImage',
    'description',
    'publishedYear',
    'pageCount',
    'language',
    'goodreadsId',
    'goodreadsRating',
    'goodreadsRatingsCount',
    'googleBooksId',
    'googleBooksRating',
    'googleBooksRatingsCount',
  ];

  for (const key of scalarKeys) {
    const incoming = payload[key];
    if (incoming === undefined || incoming === null || incoming === '') continue;

    const current = book[key];
    const isMissing =
      current === undefined ||
      current === null ||
      current === '' ||
      (typeof current === 'number' && !Number.isFinite(current));

    if (isMissing) {
      book[key] = incoming;
    }
  }

  if (Array.isArray(payload.genre) && payload.genre.length > 0) {
    const current = Array.isArray(book.genre) ? book.genre : [];
    if (current.length === 0) {
      book.genre = payload.genre;
    }
  }
}

async function findCanonicalByIsbnNormalized(isbnNormalized) {
  if (!isbnNormalized) return null;
  return Book.findOne({
    isbnNormalized,
    isArchived: { $ne: true },
  }).sort({ createdAt: 1 });
}

async function upsertCanonicalBookFromExternal({ source, externalBook, userId }) {
  const payload = buildExternalPayload(source, externalBook);
  const { idField } = getProviderFields(source);

  let book = null;
  if (payload.isbnNormalized) {
    book = await findCanonicalByIsbnNormalized(payload.isbnNormalized);
  }

  if (!book && payload[idField]) {
    book = await Book.findOne({
      [idField]: payload[idField],
      isArchived: { $ne: true },
    }).sort({ createdAt: 1 });
  }

  if (book) {
    mergeBookMetadata(book, payload);
    if (book.isModified()) {
      await book.save();
    }
    return { book, created: false, reused: true };
  }

  book = await Book.create({
    ...payload,
    createdBy: userId,
    visibility: 'private',
    isArchived: false,
  });

  return { book, created: true, reused: false };
}

module.exports = {
  findCanonicalByIsbnNormalized,
  upsertCanonicalBookFromExternal,
};
