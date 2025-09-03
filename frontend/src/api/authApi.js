// frontend/src/api/authApi.js

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export const register = async (formData) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
    credentials: 'include', // send cookies
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Registration failed');
  return data;
};

export const login = async (formData) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
    credentials: 'include', // send cookies
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
};

export const loginWithOtp = async ({ email, method, code, deviceId }) => {
  const res = await fetch(`${API_URL}/auth/login-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method, code, deviceId }),
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'OTP login failed');
  return data;
};

export const requestOtp = async ({ email, method }) => {
  const res = await fetch(`${API_URL}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method }),
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
  return data;
};

export const verifyOtp = async ({ email, method, code }) => {
  const res = await fetch(`${API_URL}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method, code }),
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.message || 'OTP verify failed');
  return data;
};

export const getProfile = async () => {
  const res = await fetch(`${API_URL}/auth/profile`, {
    credentials: 'include', // send cookies
  });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
};

export const logout = async () => {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
};