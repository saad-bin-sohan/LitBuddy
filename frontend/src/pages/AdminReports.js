// frontend/src/pages/AdminReports.js


import React, { useEffect, useState } from 'react';
import AdminGuard from '../components/AdminGuard';
import { getAllReports } from '../api/reportApi';



/**
 * AdminReports (robust)
 *
 * - Does NOT assume API_URL exists as an import (defensive).
 * - Normalizes backend base from REACT_APP_BACKEND_URL or infers a sensible default.
 * - Uses getAllReports helper for listing.
 * - Uses direct fetch() to admin endpoints (constructed from BACKEND_API).
 */

// Normalize backend base: strip trailing slashes and any trailing '/api'
function normalizeBackendBase(raw) {
  if (raw && typeof raw === 'string') {
    let s = raw.trim();
    s = s.replace(/\/+$/, ''); // remove trailing slashes
    s = s.replace(/\/api\/?$/, ''); // remove trailing /api if present
    if (s) return s;
  }
  // fallback: if frontend is on e.g. http://localhost:3000 assume backend at same host:5001
  try {
    const host = window?.location?.hostname || 'localhost';
    const protocol = window?.location?.protocol || 'http:';
    return `${protocol}//${host}:5001`;
  } catch (e) {
    return 'http://localhost:5001';
  }
}

const RAW_BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const BACKEND_BASE = normalizeBackendBase(RAW_BACKEND);
const BACKEND_API = `${BACKEND_BASE.replace(/\/$/, '')}/api`;

// Backend enum-ish options (match backend model)
const STATUS_OPTIONS = ['Pending', 'Reviewed', 'Resolved'];

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '' });

  const fetchReports = async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit };
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;

      const data = await getAllReports(params);
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setPage(data.page || 1);
      setTotalPages(data.pages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  /* Admin actions (call admin routes on backend API) */
  const suspendUser = async (userId) => {
    const daysStr = window.prompt('Suspend user for how many days? (default 7)', '7');
    if (daysStr === null) return;
    const days = parseInt(daysStr, 10) || 7;
    if (!window.confirm(`Suspend user for ${days} day(s)?`)) return;

    try {
      setActionLoadingId(userId);
      const res = await fetch(`${BACKEND_API}/admin/users/${encodeURIComponent(userId)}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Use cookies instead of Authorization header
        body: JSON.stringify({ days }),
      });
      if (!res.ok) {
        const t = await res.text();
        let body = {};
        try { body = JSON.parse(t || '{}'); } catch { body = { message: t }; }
        throw new Error(body.message || `Failed (${res.status})`);
      }
      await fetchReports(page);
      window.alert('User suspended');
    } catch (err) {
      window.alert('Error: ' + (err.message || 'Failed to suspend user'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const unsuspendUser = async (userId) => {
    if (!window.confirm('Unsuspend this user?')) return;
    try {
      setActionLoadingId(userId);
      const res = await fetch(`${BACKEND_API}/admin/users/${encodeURIComponent(userId)}/unsuspend`, {
        method: 'PATCH',
        credentials: 'include', // Use cookies instead of Authorization header
      });
      if (!res.ok) {
        const t = await res.text();
        let body = {};
        try { body = JSON.parse(t || '{}'); } catch { body = { message: t }; }
        throw new Error(body.message || `Failed (${res.status})`);
      }
      await fetchReports(page);
      window.alert('User unsuspended');
    } catch (err) {
      window.alert('Error: ' + (err.message || 'Failed to unsuspend user'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const resetReportsCount = async (userId) => {
    if (!window.confirm('Reset report count for this user?')) return;
    try {
      setActionLoadingId(userId);
      const res = await fetch(`${BACKEND_API}/admin/users/${encodeURIComponent(userId)}/reset-reports`, {
        method: 'PATCH',
        credentials: 'include', // Use cookies instead of Authorization header
      });
      if (!res.ok) {
        const t = await res.text();
        let body = {};
        try { body = JSON.parse(t || '{}'); } catch { body = { message: t }; }
        throw new Error(body.message || `Failed (${res.status})`);
      }
      await fetchReports(page);
      window.alert('Report count reset');
    } catch (err) {
      window.alert('Error: ' + (err.message || 'Failed to reset reports'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const normalizeImageUrl = (u) => {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/')) return `${BACKEND_BASE}${u}`;
    if (u.startsWith('uploads/')) return `${BACKEND_BASE}/${u}`;
    return u;
  };

  const ReportCard = ({ report }) => {
    const reported = report.reportedUser || {};
    const reporter = report.reporter || {};
    const reportedUserId = reported._id || report.reportedUser;

    return (
      <div key={report._id} style={{ border: '1px solid #ccc', margin: '10px', padding: '12px', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>{report.category}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(report.createdAt).toLocaleString()}</div>
              <div style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>Status: {report.status || 'Pending'}</div>
            </div>

            <p style={{ marginTop: 8 }}>{report.description}</p>

            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
              <div><strong>Reporter:</strong> {reporter.name || reporter.displayName || reporter.email || '—'}</div>
              <div><strong>Reported:</strong> {reported.name || reported.displayName || reported.email || reported._id || '—'}</div>
            </div>

            {report.image && (
              <div style={{ marginTop: 10 }}>
                <img src={normalizeImageUrl(report.image)} alt="evidence" style={{ maxWidth: 300, borderRadius: 8, border: '1px solid #eee' }} />
              </div>
            )}
          </div>

          <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn"
              onClick={() => window.open(`/profile/${reportedUserId}`, '_blank')}
            >
              View Reported Profile
            </button>

            <button
              className="btn btn-warning"
              onClick={() => suspendUser(reportedUserId)}
              disabled={actionLoadingId === reportedUserId}
            >
              {actionLoadingId === reportedUserId ? 'Working...' : 'Suspend User'}
            </button>

            <button
              className="btn"
              onClick={() => unsuspendUser(reportedUserId)}
              disabled={actionLoadingId === reportedUserId}
            >
              Unsuspend User
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => resetReportsCount(reportedUserId)}
              disabled={actionLoadingId === reportedUserId}
            >
              Reset Reports Count
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminGuard>
      <div style={{ padding: 24 }}>
        <h2>Admin — Reports</h2>

        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <label>
            Status:
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ marginLeft: 8 }}>
              <option value="">Any</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label>
            Category:
            <input
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              placeholder="e.g. Harassment"
              style={{ marginLeft: 8 }}
            />
          </label>

          <button className="btn" onClick={() => fetchReports(1)}>Refresh</button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : reports.length === 0 ? (
          <p style={{ marginTop: 12 }}>No reports found.</p>
        ) : (
          <>
            <div style={{ marginTop: 12 }}>
              {reports.map((r) => <ReportCard key={r._id} report={r} />)}
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className="btn" onClick={() => fetchReports(Math.max(1, page - 1))} disabled={page <= 1}>
                Prev
              </button>
              <div>Page {page} / {totalPages} • Total {totalCount}</div>
              <button className="btn" onClick={() => fetchReports(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
};

export default AdminReports;
