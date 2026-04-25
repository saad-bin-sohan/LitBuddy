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
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...options,
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
