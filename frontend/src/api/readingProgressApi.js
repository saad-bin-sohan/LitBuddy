// frontend/src/api/readingProgressApi.js
//
// 2026-09 fix: addBookToList/addToList/updateProgress/removeFromList
// each built their own raw fetch() instead of going through the shared
// apiJson() helper in ./httpClient, so none of them sent the
// 'X-Requested-With' header backend/middleware/csrfMiddleware.js
// requires on mutating requests -- adding a book to a reading list,
// updating progress, and removing a book were all silently rejected
// with a 403 before reaching the controller. getReadingLists/
// getReadingStats were GET-only and unaffected, but are migrated
// alongside the rest for a single consistent pattern.

import { apiJson } from './httpClient';

export const readingProgressApi = {
  // Add book to reading list
  addBookToList: async (bookData) =>
    apiJson('/reading-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      errorMessage: 'Failed to add book to list',
    }),

  // Add book to specific reading list
  addToList: async (bookData) =>
    apiJson('/reading-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData),
      errorMessage: 'Failed to add book to list',
    }),

  // Update reading progress
  updateProgress: async (progressId, progressData) =>
    apiJson(`/reading-progress/${progressId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData),
      errorMessage: 'Failed to update progress',
    }),

  // Get reading lists
  getReadingLists: async (status) => {
    const params = status ? { status } : {};
    const queryString = new URLSearchParams(params).toString();
    return apiJson(`/reading-progress/lists?${queryString}`, {
      errorMessage: 'Failed to get reading lists',
    });
  },

  // Remove book from list
  removeFromList: async (progressId) =>
    apiJson(`/reading-progress/${progressId}`, {
      method: 'DELETE',
      errorMessage: 'Failed to remove book from list',
    }),

  // Get reading statistics
  getReadingStats: async (year) => {
    const params = year ? { year } : {};
    const queryString = new URLSearchParams(params).toString();
    return apiJson(`/reading-progress/stats?${queryString}`, {
      errorMessage: 'Failed to get reading stats',
    });
  },
};
