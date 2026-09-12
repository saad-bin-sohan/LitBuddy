// frontend/src/api/passwordApi.js
//
// 2026-09 fix: both functions built their own raw fetch() (POST)
// instead of going through the shared apiJson() helper in ./httpClient,
// so neither sent the 'X-Requested-With' header
// backend/middleware/csrfMiddleware.js requires on mutating requests --
// requesting a password reset and submitting a new password were both
// silently rejected with a 403 before reaching the controller (this is
// a public, unauthenticated flow, but the CSRF check runs on method +
// Origin, independent of whether the caller is logged in). apiJson()
// also sends `credentials: 'include'` by default; that's harmless here
// since these endpoints don't require a session cookie either way.

import { apiJson } from './httpClient';

export const requestPasswordReset = async ({ email, recaptchaToken } = {}) =>
  apiJson('/password/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, recaptchaToken }),
    errorMessage: 'Failed to request password reset',
  });

export const resetPassword = async ({ email, token, newPassword }) =>
  apiJson('/password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword }),
    errorMessage: 'Password reset failed',
  });
