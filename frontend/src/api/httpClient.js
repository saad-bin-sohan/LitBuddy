const LEGACY_TOKEN_KEY = 'token';
const LEGACY_TOKEN_MIGRATION_KEY = 'litbuddy_legacy_token_migration_v1';

function readEnv(viteKey, legacyKey) {
  const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env || {} : {};
  const processEnv = typeof process !== 'undefined' ? process.env || {} : {};
  return viteEnv[viteKey] ?? processEnv[legacyKey];
}

function normalizeApiBase(raw) {
  const value = String(raw || '').trim();
  if (!value) return '/api';

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const trimmed = value.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return normalizedPath.endsWith('/api') ? normalizedPath : `${normalizedPath}/api`;
}

function normalizeWsBase(rawWsBase, apiBase) {
  const value = String(rawWsBase || '').trim();
  if (value) return value.replace(/\/+$/, '');

  if (apiBase.startsWith('https://')) return apiBase.replace(/^https:\/\//, 'wss://').replace(/\/api$/, '/ws');
  if (apiBase.startsWith('http://')) return apiBase.replace(/^http:\/\//, 'ws://').replace(/\/api$/, '/ws');
  if (apiBase === '/api') return '/ws';
  return `${apiBase.replace(/\/api$/, '')}/ws`;
}

export const API_URL = normalizeApiBase(
  readEnv('VITE_API_BASE_URL', 'REACT_APP_BACKEND_URL') || '/api'
);

const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;

export const WS_URL = normalizeWsBase(
  readEnv('VITE_WS_BASE_URL', 'REACT_APP_WS_BASE_URL') || (isProd ? 'wss://litbuddy.onrender.com/ws' : ''),
  API_URL
);

export const GOOGLE_CLIENT_ID =
  readEnv('VITE_GOOGLE_CLIENT_ID', 'REACT_APP_GOOGLE_CLIENT_ID') || '';
export const IS_GOOGLE_AUTH_ENABLED = Boolean(String(GOOGLE_CLIENT_ID || '').trim());

// BACKEND_BASE: the backend origin without the /api suffix.
// Example: if API_URL is 'https://litbuddy.onrender.com/api'
//          then BACKEND_BASE is 'https://litbuddy.onrender.com'
// Used to build absolute URLs for uploaded files.
export const BACKEND_BASE = API_URL.replace(/\/api\/?$/, '');

/**
 * fileUrl(relativeOrAbsoluteUrl)
 *
 * Normalizes an uploaded file URL to an absolute URL pointing at the backend.
 * Uploaded files are stored in MongoDB with URLs like '/uploads/filename'.
 * In a split Vercel + Render deployment, relative URLs like '/uploads/...'
 * would resolve to the Vercel frontend -- not the Render backend where the
 * files are stored. This helper ensures they always resolve to the backend.
 *
 * Usage:
 *   <img src={fileUrl(attachment.url)} crossOrigin="use-credentials" />
 *   fetch(fileUrl(attachment.url), { credentials: 'include' })
 */
export function fileUrl(relativeOrAbsoluteUrl = '') {
  const s = String(relativeOrAbsoluteUrl || '').trim();
  if (!s) return '';
  // Already absolute -- return unchanged
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  // Relative path with leading slash -- prepend backend base
  if (s.startsWith('/')) return `${BACKEND_BASE}${s}`;
  // Relative path without leading slash (e.g. 'uploads/file.jpg')
  return `${BACKEND_BASE}/${s}`;
}

export function apiUrl(path = '') {
  if (!path) return API_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${API_URL}${path}`;
  return `${API_URL}/${path}`;
}

export async function parseJsonSafe(response) {
  try {
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function apiFetch(path, options = {}) {
  const existingHeaders = options.headers || {};
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      ...existingHeaders,
    },
  });
}

export async function apiJson(path, options = {}) {
  const response = await apiFetch(path, options);
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.body = data;
    throw error;
  }
  return data;
}

export function clearLegacyTokenOnce() {
  try {
    if (localStorage.getItem(LEGACY_TOKEN_MIGRATION_KEY)) return;
    const legacyValue = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyValue !== null) {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    localStorage.setItem(LEGACY_TOKEN_MIGRATION_KEY, 'done');
  } catch {
    // Ignore storage access failures (private mode / disabled storage).
  }
}
