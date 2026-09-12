// frontend/src/api/goodreadsApi.js
//
// 2026-09 fix: importBook built its own raw fetch() (POST) instead of
// going through the shared apiJson() helper in ./httpClient, so it never
// sent the 'X-Requested-With' header backend/middleware/csrfMiddleware.js
// requires on mutating requests -- importing a book from GoodReads was
// silently rejected with a 403 before reaching the controller. The
// search/lookup functions were GET-only and unaffected, but are migrated
// alongside the rest for a single consistent pattern.

import { apiJson } from './httpClient';

export const goodreadsApi = {
  // Search books on GoodReads
  searchBooks: async (query, page = 1) =>
    apiJson(`/goodreads/search?query=${encodeURIComponent(query)}&page=${page}`, {
      errorMessage: 'Failed to search GoodReads',
    }),

  // Get book details by GoodReads ID
  getBookById: async (goodreadsId) =>
    apiJson(`/goodreads/book/${goodreadsId}`, { errorMessage: 'Failed to get book details' }),

  // Get book details by ISBN
  getBookByIsbn: async (isbn) =>
    apiJson(`/goodreads/book/isbn/${isbn}`, { errorMessage: 'Failed to get book by ISBN' }),

  // Get author information
  getAuthor: async (authorId) =>
    apiJson(`/goodreads/author/${authorId}`, { errorMessage: 'Failed to get author information' }),

  // Import book from GoodReads
  importBook: async (importData) =>
    apiJson('/goodreads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importData),
      errorMessage: 'Failed to import book',
    }),
};
