import { apiJson } from './httpClient';

export const register = async (formData) =>
  apiJson('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

export const login = async (formData) =>
  apiJson('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

export const loginWithOtp = async ({ email, method, code, deviceId }) =>
  apiJson('/auth/login-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method, code, deviceId }),
  });

export const requestOtp = async ({ email, method }) =>
  apiJson('/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method }),
  });

export const verifyOtp = async ({ email, method, code }) =>
  apiJson('/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method, code }),
  });

export const getProfile = async () => apiJson('/auth/profile');

export const logout = async () =>
  apiJson('/auth/logout', {
    method: 'POST',
  });

export const googleAuthCallback = async (googleData) =>
  apiJson('/auth/google/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(googleData),
  });

export const checkGoogleUser = async (googleId) =>
  apiJson('/auth/google/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ googleId }),
  });
