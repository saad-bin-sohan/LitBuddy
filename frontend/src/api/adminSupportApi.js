// frontend/src/api/adminSupportApi.js
//
// 2026-09 fix: the shared request() helper built its own raw fetch()
// instead of going through the shared apiFetch() helper in ./httpClient,
// so it never sent the 'X-Requested-With' header
// backend/middleware/csrfMiddleware.js requires on mutating requests --
// updateSubmission's PATCH was silently rejected with a 403 before
// reaching the controller.

import { apiFetch } from './httpClient';

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function toQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  });
  const q = sp.toString();
  return q ? `?${q}` : '';
}

async function request(path, options = {}) {
  const res = await apiFetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Admin support request failed');
  return data;
}

export const adminSupportApi = {
  listSubmissions(params = {}) {
    return request(`/admin/support/submissions${toQuery(params)}`);
  },
  updateSubmission(id, payload) {
    return request(`/admin/support/submissions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
