import { describe, it, expect, beforeEach } from 'vitest';
import { API_URL, apiUrl, clearLegacyTokenOnce } from './httpClient';

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe('httpClient', () => {
  beforeEach(() => {
    globalThis.localStorage = createStorage();
  });

  it('builds API paths from normalized base', () => {
    expect(API_URL.endsWith('/api')).toBe(true);
    expect(apiUrl('/profile/me')).toContain('/api/profile/me');
  });

  it('removes legacy token once during migration', () => {
    globalThis.localStorage.setItem('token', 'undefined');
    clearLegacyTokenOnce();
    expect(globalThis.localStorage.getItem('token')).toBeNull();
    expect(globalThis.localStorage.getItem('litbuddy_legacy_token_migration_v1')).toBe('done');

    globalThis.localStorage.setItem('token', 'stale-token');
    clearLegacyTokenOnce();
    expect(globalThis.localStorage.getItem('token')).toBe('stale-token');
  });
});
