// frontend/src/api/matchApi.js
//
// 2026-09 fix: likeUser() built its own raw fetch() (POST) instead of
// going through the shared apiJson() helper in ./httpClient, so it never
// sent the 'X-Requested-With' header backend/middleware/csrfMiddleware.js
// requires on mutating requests -- every "like" a user made was silently
// rejected with a 403 before reaching the controller. Routed through
// apiJson() here (and getSuggestions/getMatches migrated alongside it
// for consistency, since they were duplicating a local parseJsonSafe
// that ./httpClient already provides -- their GET requests were never
// affected by CSRF either way).

import { apiJson } from './httpClient';

/**
 * Get suggestions with optional location filter.
 * Accepts an optional object: { lat, lng, distanceKm, limit }
 */
export const getSuggestions = async ({ lat, lng, distanceKm, limit } = {}) => {
  const params = new URLSearchParams();
  if (typeof lat !== 'undefined' && typeof lng !== 'undefined') {
    params.append('lat', lat);
    params.append('lng', lng);
  }
  if (typeof distanceKm !== 'undefined') params.append('distanceKm', distanceKm);
  if (typeof limit !== 'undefined') params.append('limit', limit);

  const query = params.toString();
  const path = query ? `/match/suggestions?${query}` : '/match/suggestions';

  return apiJson(path, { errorMessage: 'Failed to fetch suggestions' });
};

export const likeUser = async (userId) =>
  apiJson(`/match/like/${userId}`, {
    method: 'POST',
    errorMessage: 'Failed to like user',
  });

export const getMatches = async () =>
  apiJson('/match', { errorMessage: 'Failed to fetch matches' });
