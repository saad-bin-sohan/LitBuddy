// frontend/src/api/reportApi.js
/**
 * reportApi.js
 * - Normalizes REACT_APP_BACKEND_URL so it works whether you set it to:
 *    http://localhost:5001
 *    http://localhost:5001/
 *    http://localhost:5001/api
 *    http://localhost:5001/api/
 *
 * - Exposes submitReport (supports FormData or plain object and upload progress),
 *   getAllReports, getReport, updateReportStatus, addModeratorNote.
 */

function normalizeBaseUrl(raw) {
  if (!raw) return 'http://localhost:5001';
  let s = String(raw).trim();
  // remove trailing slashes
  s = s.replace(/\/+$/, '');
  // if user provided only host w/o protocol (unlikely) we won't try to fix it here
  return s;
}

const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const BACKEND_BASE = normalizeBaseUrl(RAW_BACKEND);
// If the provided base already ends with '/api', use it as-is, otherwise append '/api'
export const API_URL = BACKEND_BASE.endsWith('/api') ? BACKEND_BASE : `${BACKEND_BASE}/api`;

/**
 * Helper: build query string from params object (ignores undefined/null/empty)
 */
function qs(params = {}) {
  const parts = [];
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * submitReport
 *  - Accepts FormData OR a plain object (will be converted to FormData).
 *  - Optional options: { onProgress: (pct)=>void, signal: AbortSignal }
 */
export const submitReport = async (data, options = {}) => {
  const { onProgress, signal } = options;

  // Ensure we have a FormData
  let formData;
  if (data instanceof FormData) {
    formData = data;
  } else {
    formData = new FormData();
    Object.keys(data || {}).forEach((k) => {
      const v = data[k];
      if (Array.isArray(v)) {
        v.forEach((item) => formData.append(k, item));
      } else if (v !== undefined && v !== null) {
        formData.append(k, v);
      }
    });
  }

  const endpoint = `${API_URL.replace(/\/$/, '')}/report`;

  // If caller requested progress, use XHR
  if (typeof onProgress === 'function') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      // Remove Authorization header - use cookies instead
      xhr.withCredentials = true; // Send cookies

      if (signal) {
        const onAbort = () => {
          try { xhr.abort(); } catch (e) {}
          reject(new DOMException('Aborted', 'AbortError'));
        };
        try {
          if (signal.aborted) return onAbort();
          signal.addEventListener('abort', onAbort, { once: true });
        } catch (e) {
          // ignore
        }
      }

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded * 100) / ev.total);
          try { onProgress(pct); } catch (_) {}
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {}); }
          catch (_) { resolve({}); }
        } else {
          let message = xhr.statusText || `HTTP ${xhr.status}`;
          try {
            const body = JSON.parse(xhr.responseText || '{}');
            message = body.message || JSON.stringify(body);
          } catch (e) {}
          reject(new Error(message));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }

  // Fallback: fetch (no upload progress)
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include', // Use cookies instead of Authorization header
    body: formData,
    signal,
  });

  const text = await res.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch (err) { body = { message: text }; }

  if (!res.ok) {
    throw new Error(body.message || 'Report submission failed');
  }
  return body;
};

/**
 * getAllReports
 */
export const getAllReports = async (params = {}) => {
  const res = await fetch(`${API_URL}/report${qs(params)}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include', // Use cookies instead of Authorization header
  });
  if (!res.ok) {
    const text = await res.text();
    let body;
    try { body = JSON.parse(text || '{}'); } catch (e) { body = { message: text }; }
    throw new Error(body.message || 'Failed to fetch reports');
  }
  return res.json();
};

/**
 * getReport
 */
export const getReport = async (id) => {
  if (!id) throw new Error('Report id required');

  const res = await fetch(`${API_URL}/report/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include', // Use cookies instead of Authorization header
  });

  if (!res.ok) {
    const text = await res.text();
    let body;
    try { body = JSON.parse(text || '{}'); } catch (e) { body = { message: text }; }
    throw new Error(body.message || 'Failed to fetch report');
  }
  return res.json();
};

/**
 * ADMIN helpers
 */
export const updateReportStatus = async (reportId, payload = {}) => {
  if (!reportId) throw new Error('reportId required');

  const res = await fetch(`${API_URL}/admin/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Use cookies instead of Authorization header
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    let body;
    try { body = JSON.parse(text || '{}'); } catch (e) { body = { message: text }; }
    throw new Error(body.message || 'Failed to update report status');
  }
  return res.json();
};

export const addModeratorNote = async (reportId, note) => {
  if (!reportId || !note) throw new Error('reportId and note required');

  const res = await fetch(`${API_URL}/admin/reports/${encodeURIComponent(reportId)}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Use cookies instead of Authorization header
    body: JSON.stringify({ note }),
  });

  if (!res.ok) {
    const text = await res.text();
    let body;
    try { body = JSON.parse(text || '{}'); } catch (e) { body = { message: text }; }
    throw new Error(body.message || 'Failed to add moderator note');
  }
  return res.json();
};
