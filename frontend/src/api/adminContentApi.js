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
  if (!res.ok) throw new Error(data.message || 'Admin request failed');
  return data;
}

export const adminContentApi = {
  listBlog(params = {}) {
    return request(`/admin/content/blog${toQuery(params)}`);
  },
  createBlog(payload) {
    return request('/admin/content/blog', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateBlog(id, payload) {
    return request(`/admin/content/blog/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteBlog(id) {
    return request(`/admin/content/blog/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listCareers(params = {}) {
    return request(`/admin/content/careers${toQuery(params)}`);
  },
  createCareer(payload) {
    return request('/admin/content/careers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateCareer(id, payload) {
    return request(`/admin/content/careers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deleteCareer(id) {
    return request(`/admin/content/careers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listPressResources(params = {}) {
    return request(`/admin/content/press-resources${toQuery(params)}`);
  },
  createPressResource(payload) {
    return request('/admin/content/press-resources', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updatePressResource(id, payload) {
    return request(`/admin/content/press-resources/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  deletePressResource(id) {
    return request(`/admin/content/press-resources/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
