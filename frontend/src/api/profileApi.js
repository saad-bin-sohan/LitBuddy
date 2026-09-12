// frontend/src/api/profileApi.js
//
// 2026-09 fix: every function here used to build its own raw fetch()
// call instead of going through the shared apiJson()/apiFetch() helpers
// in ./httpClient. That meant none of these requests carried the
// 'X-Requested-With' header that backend/middleware/csrfMiddleware.js
// requires on every mutating request -- so updateProfile()'s PUT always
// got rejected with a 403 ("CSRF check failed") before it ever reached
// the controller. The generic `throw new Error('Profile update failed')`
// below then hid that real reason from the UI. Routing through apiJson()
// fixes both: the header is now always attached, and a real server
// message (when present) reaches the caller instead of a fixed string.

import { apiJson } from './httpClient';

// Fetch logged-in user's own full profile
export const getMyProfile = async () =>
  apiJson('/profile/me', { errorMessage: 'Failed to fetch profile' });

// Update logged-in user's profile
export const updateProfile = async (formData) =>
  apiJson('/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
    errorMessage: 'Profile update failed',
  });

// Fetch public profile by userId
export const getPublicProfile = async (userId) =>
  apiJson(`/profile/${userId}`, { errorMessage: 'Failed to fetch public profile' });
