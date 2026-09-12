// frontend/src/api/googleBooksApi.js
//
// 2026-09 fix: importBook built its own raw fetch() (POST) instead of
// going through the shared apiJson() helper in ./httpClient, so it never
// sent the 'X-Requested-With' header backend/middleware/csrfMiddleware.js
// requires on mutating requests -- importing a book from Google Books
// was silently rejected with a 403 before reaching the controller. The
// search/lookup functions were GET-only and unaffected, but are migrated
// alongside the rest for a single consistent pattern.

import { apiJson } from './httpClient';

export const googleBooksApi = {
  // Search books on Google Books
  searchBooks: async (query, page = 1) =>
    apiJson(`/googlebooks/search?query=${encodeURIComponent(query)}&page=${page}`, {
      errorMessage: 'Failed to search Google Books',
    }),

  // Get book details by Google Books volume ID
  getBookById: async (volumeId) =>
    apiJson(`/googlebooks/book/${volumeId}`, { errorMessage: 'Failed to get book details' }),

  // Get book details by ISBN
  getBookByIsbn: async (isbn) =>
    apiJson(`/googlebooks/book/isbn/${isbn}`, { errorMessage: 'Failed to get book by ISBN' }),

  // Import book from Google Books
  importBook: async (importData) =>
    apiJson('/googlebooks/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importData),
      errorMessage: 'Failed to import book',
    }),
};
