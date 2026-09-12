// frontend/src/api/readingGoalApi.js
//
// 2026-09 fix: setReadingGoals/updateProgress each built their own raw
// fetch() instead of going through the shared apiJson() helper in
// ./httpClient, so neither sent the 'X-Requested-With' header
// backend/middleware/csrfMiddleware.js requires on mutating requests --
// setting a yearly reading goal and manually updating progress were both
// silently rejected with a 403 before reaching the controller.
// getReadingGoals/getAchievements were GET-only and unaffected, but are
// migrated alongside the rest for a single consistent pattern.

import { apiJson } from './httpClient';

export const readingGoalApi = {
  // Set reading goals
  setReadingGoals: async (goalsData) =>
    apiJson('/reading-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalsData),
      errorMessage: 'Failed to set reading goals',
    }),

  // Get reading goals
  getReadingGoals: async (year) => {
    const params = year ? { year } : {};
    const queryString = new URLSearchParams(params).toString();
    return apiJson(`/reading-goals?${queryString}`, {
      errorMessage: 'Failed to get reading goals',
    });
  },

  // Get achievements
  getAchievements: async () =>
    apiJson('/reading-goals/achievements', { errorMessage: 'Failed to get achievements' }),

  // Update progress manually
  updateProgress: async (progressData) =>
    apiJson('/reading-goals/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progressData),
      errorMessage: 'Failed to update progress',
    }),
};
