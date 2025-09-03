// frontend/src/api/profileApi.js

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

// Fetch logged-in user's own full profile
export const getMyProfile = async () => {
  const res = await fetch(`${API_URL}/profile/me`, {
    credentials: 'include', // send cookies
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
};

// Update logged-in user's profile
export const updateProfile = async (formData) => {
  const res = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
    credentials: 'include', // send cookies
  });
  if (!res.ok) throw new Error('Profile update failed');
  return res.json();
};

// Fetch public profile by userId
export const getPublicProfile = async (userId) => {
  const res = await fetch(`${API_URL}/profile/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch public profile');
  return res.json();
};