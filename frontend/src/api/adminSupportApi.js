import { API_URL } from './httpClient';

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
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
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
