// frontend/src/api/subscriptionApi.js
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export const getSubscription = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token');
  const res = await fetch(`${API_URL}/subscription`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to fetch subscription');
  return data;
};

export const upgradeSubscription = async (maxActiveConversations) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token');
  const res = await fetch(`${API_URL}/subscription/upgrade`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ maxActiveConversations }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const e = new Error(data.message || 'Failed to upgrade');
    e.body = data;
    throw e;
  }
  return data;
};
