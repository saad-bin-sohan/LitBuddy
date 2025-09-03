// frontend/src/api/matchApi.js

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

// Helper to parse JSON safely
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Get suggestions with optional location filter.
 * Accepts an optional object: { lat, lng, distanceKm, limit }
 */
export const getSuggestions = async ({ lat, lng, distanceKm, limit } = {}) => {
  let url = `${API_URL}/match/suggestions`;
  const params = new URLSearchParams();
  if (typeof lat !== 'undefined' && typeof lng !== 'undefined') {
    params.append('lat', lat);
    params.append('lng', lng);
  }
  if (typeof distanceKm !== 'undefined') params.append('distanceKm', distanceKm);
  if (typeof limit !== 'undefined') params.append('limit', limit);

  const query = params.toString();
  if (query) url += `?${query}`;

  const res = await fetch(url, {
    credentials: 'include', // Use cookies instead of Authorization header
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to fetch suggestions');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

export const likeUser = async (userId) => {
  const res = await fetch(`${API_URL}/match/like/${userId}`, {
    method: 'POST',
    credentials: 'include', // Use cookies instead of Authorization header
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to like user');
  }
  return res.json();
};

export const getMatches = async () => {
  const res = await fetch(`${API_URL}/match`, {
    credentials: 'include', // Use cookies instead of Authorization header
  });
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
};