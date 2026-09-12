// frontend/src/api/reportApi.js
/**
 * reportApi.js
 * - Exposes submitReport (supports FormData or plain object and upload progress),
 *   getAllReports, getReport, updateReportStatus, addModeratorNote.
 *
 * 2026-09 fix: every request in this file was built by hand (raw fetch()
 * or raw XMLHttpRequest) instead of going through the shared apiFetch()/
 * apiJson() helpers in ./httpClient, so none of them sent the
 * 'X-Requested-With' header backend/middleware/csrfMiddleware.js
 * requires on mutating requests. Submitting a report, and the admin
 * actions (updateReportStatus/addModeratorNote), were all silently
 * rejected with a 403 before reaching the controller. The XHR upload
 * path in submitReport is kept (it's the only way to get real upload
 * progress) but now explicitly sets the same header via
 * xhr.setRequestHeader(); the plain fetch/GET paths are routed through
 * apiFetch()/apiJson() so they get it automatically, along with
 * `credentials: 'include'` and safer JSON parsing.
 */
import { apiUrl, apiFetch, apiJson } from './httpClient';

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

  const endpoint = apiUrl('/report');

  // If caller requested progress, use XHR
  if (typeof onProgress === 'function') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      // Remove Authorization header - use cookies instead
      xhr.withCredentials = true; // Send cookies
      // Required by backend/middleware/csrfMiddleware.js on every
      // mutating request; must be set after open() and before send().
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

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
  const res = await apiFetch('/report', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
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
export const getAllReports = async (params = {}) =>
  apiJson(`/report${qs(params)}`, {
    headers: { Accept: 'application/json' },
    errorMessage: 'Failed to fetch reports',
  });

/**
 * getReport
 */
export const getReport = async (id) => {
  if (!id) throw new Error('Report id required');

  return apiJson(`/report/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
    errorMessage: 'Failed to fetch report',
  });
};

/**
 * ADMIN helpers
 */
export const updateReportStatus = async (reportId, payload = {}) => {
  if (!reportId) throw new Error('reportId required');

  return apiJson(`/admin/reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    errorMessage: 'Failed to update report status',
  });
};

export const addModeratorNote = async (reportId, note) => {
  if (!reportId || !note) throw new Error('reportId and note required');

  return apiJson(`/admin/reports/${encodeURIComponent(reportId)}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
    errorMessage: 'Failed to add moderator note',
  });
};
