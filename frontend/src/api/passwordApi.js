// frontend/src/api/passwordApi.js

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export const requestPasswordReset = async ({ email, recaptchaToken } = {}) => {
  const res = await fetch(`${API_URL}/password/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, recaptchaToken }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to request password reset');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

export const resetPassword = async ({ email, token, newPassword }) => {
  const res = await fetch(`${API_URL}/password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Password reset failed');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};
