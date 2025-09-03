// frontend/src/api/notificationApi.js
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

async function parseJsonSafe(res) {
  try { return await res.json(); } catch { return {}; }
}

export const fetchNotifications = async () => {
  const res = await fetch(`${API_URL}/notifications`, {
    credentials: 'include', // Use cookies instead of Authorization header
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to fetch notifications');
  return data;
};

export const markNotificationRead = async (id) => {
  const res = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Use cookies instead of Authorization header
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to mark read');
  return data;
};
