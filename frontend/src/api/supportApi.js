// frontend/src/api/supportApi.js
//
// 2026-09 fix: the shared postSubmission() helper built its own raw
// fetch() (POST) instead of going through the shared apiJson() helper in
// ./httpClient, so neither sendContact nor sendFeedback (both of which
// call postSubmission) sent the 'X-Requested-With' header
// backend/middleware/csrfMiddleware.js requires on mutating requests --
// submitting the contact form and the feedback form were both silently
// rejected with a 403 before reaching the controller.

import { apiJson } from './httpClient';

async function postSubmission(path, payload) {
  return apiJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    errorMessage: 'Failed to submit request',
  });
}

export function sendContact(payload) {
  return postSubmission('/support/contact', payload);
}

export function sendFeedback(payload) {
  return postSubmission('/support/feedback', payload);
}
