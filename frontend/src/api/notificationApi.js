// frontend/src/api/notificationApi.js
//
// 2026-09 fix: markNotificationRead built its own raw fetch() (PATCH)
// instead of going through the shared apiJson() helper in ./httpClient,
// so it never sent the 'X-Requested-With' header
// backend/middleware/csrfMiddleware.js requires on mutating requests --
// marking a notification as read was silently rejected with a 403
// before reaching the controller. fetchNotifications (GET) was never
// affected by CSRF but is migrated alongside it for consistency.

import { apiJson } from './httpClient';

export const fetchNotifications = async () =>
  apiJson('/notifications', { errorMessage: 'Failed to fetch notifications' });

export const markNotificationRead = async (id) =>
  apiJson(`/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    errorMessage: 'Failed to mark read',
  });
