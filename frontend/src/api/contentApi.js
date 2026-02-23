const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

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

export async function getBlogPosts(params = {}) {
  const res = await fetch(`${API_URL}/content/blog${toQuery(params)}`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to load blog posts');
  return data;
}

export async function getBlogPostBySlug(slug) {
  const res = await fetch(`${API_URL}/content/blog/${encodeURIComponent(slug)}`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to load blog post');
  return data;
}

export async function getCareerOpenings(params = {}) {
  const res = await fetch(`${API_URL}/content/careers${toQuery(params)}`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to load careers');
  return data;
}

export async function getCareerBySlug(slug) {
  const res = await fetch(`${API_URL}/content/careers/${encodeURIComponent(slug)}`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to load career details');
  return data;
}

export async function getPressResources() {
  const res = await fetch(`${API_URL}/content/press/resources`);
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to load press resources');
  return data;
}
