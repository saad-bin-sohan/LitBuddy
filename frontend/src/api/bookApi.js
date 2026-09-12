// frontend/src/api/bookApi.js
//
// 2026-09 fix: createBook/updateBook/updateBookVisibility/deleteBook each
// built their own raw fetch() instead of going through the shared
// apiJson() helper in ./httpClient, so none of them sent the
// 'X-Requested-With' header backend/middleware/csrfMiddleware.js
// requires on mutating requests -- adding, editing, hiding, and deleting
// a book were all silently rejected with a 403 before reaching the
// controller. searchBooks/getBookById/getMyBooks were GET-only and were
// never affected by CSRF, but are migrated alongside the rest here too
// so the whole file shares one consistent, safer request pattern
// (apiJson never throws on an unparsable/empty body the way a bare
// `res.json()` could).

import { apiJson } from './httpClient';

export const bookApi = {
  // Create a new book
  createBook: async (bookData) => {
    const data = await apiJson('/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      errorMessage: 'Failed to create book',
    });
    return data.book || data;
  },

  // Search books
  searchBooks: async (params) => {
    const queryString = new URLSearchParams(params).toString();
    return apiJson(`/books/search?${queryString}`, {
      errorMessage: 'Failed to search books',
    });
  },

  // Get book by ID
  getBookById: async (bookId) =>
    apiJson(`/books/${bookId}`, { errorMessage: 'Failed to get book' }),

  // Update book
  updateBook: async (bookId, bookData) =>
    apiJson(`/books/${bookId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      errorMessage: 'Failed to update book',
    }),

  // Update book visibility
  updateBookVisibility: async (bookId, visibility) =>
    apiJson(`/books/${bookId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
      errorMessage: 'Failed to update book visibility',
    }),

  // Delete book
  deleteBook: async (bookId) =>
    apiJson(`/books/${bookId}`, {
      method: 'DELETE',
      errorMessage: 'Failed to delete book',
    }),

  // Get user's books
  getMyBooks: async () => apiJson('/books', { errorMessage: 'Failed to get books' }),
};
