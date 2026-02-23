import React, { useEffect, useState } from 'react';
import AdminGuard from '../components/AdminGuard';
import { adminSupportApi } from '../api/adminSupportApi';
import './PublicPages.css';

const STATUSES = ['new', 'in_review', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high'];

const AdminSupportInbox = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState({});

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminSupportApi.listSubmissions({
        type: typeFilter,
        status: statusFilter,
        search,
        limit: 100,
      });
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load support submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (item) => {
    setEditing((prev) => ({
      ...prev,
      [item._id]: {
        status: item.status,
        priority: item.priority,
        adminNotes: item.adminNotes || '',
      },
    }));
  };

  const updateEdit = (id, key, value) => {
    setEditing((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [key]: value,
      },
    }));
  };

  const saveEdit = async (id) => {
    const fallbackItem = items.find((item) => item._id === id);
    const payload = editing[id] || (fallbackItem ? {
      status: fallbackItem.status,
      priority: fallbackItem.priority,
      adminNotes: fallbackItem.adminNotes || '',
    } : null);
    if (!payload) return;

    setError('');
    setSuccess('');
    try {
      await adminSupportApi.updateSubmission(id, payload);
      setSuccess('Support submission updated.');
      await loadItems();
    } catch (err) {
      setError(err.message || 'Failed to update support submission');
    }
  };

  return (
    <AdminGuard>
      <div className="admin-panel">
        <h1 className="admin-heading">Admin Support Inbox</h1>
        <p className="admin-subheading">Review and update contact and feedback submissions from public pages.</p>

        <div className="admin-toolbar">
          <select className="public-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="contact">contact</option>
            <option value="feedback">feedback</option>
          </select>

          <select className="public-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <input
            className="public-input"
            placeholder="Search subject, email, text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button onClick={loadItems}>Refresh</button>
        </div>

        {error ? <p className="public-error">{error}</p> : null}
        {success ? <p className="public-success">{success}</p> : null}

        {loading ? <p className="public-empty">Loading support submissions...</p> : null}

        {!loading && items.length === 0 ? <p className="public-empty">No submissions found.</p> : null}

        {!loading && items.length > 0 ? (
          <div className="admin-card" style={{ overflowX: 'auto' }}>
            <table className="admin-support-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Requester</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status / Priority</th>
                  <th>Admin Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const draft = editing[item._id] || {
                    status: item.status,
                    priority: item.priority,
                    adminNotes: item.adminNotes || '',
                  };

                  return (
                    <tr key={item._id}>
                      <td>{item.submissionType}</td>
                      <td>
                        <strong>{item.name}</strong>
                        <br />
                        {item.email}
                        <br />
                        <small>{new Date(item.createdAt).toLocaleString()}</small>
                      </td>
                      <td>{item.subject}</td>
                      <td>{item.message}</td>
                      <td>
                        <label className="public-field">
                          <span className="public-label">Status</span>
                          <select
                            className="public-select"
                            value={draft.status}
                            onChange={(e) => updateEdit(item._id, 'status', e.target.value)}
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </label>
                        <label className="public-field">
                          <span className="public-label">Priority</span>
                          <select
                            className="public-select"
                            value={draft.priority}
                            onChange={(e) => updateEdit(item._id, 'priority', e.target.value)}
                          >
                            {PRIORITIES.map((priority) => (
                              <option key={priority} value={priority}>{priority}</option>
                            ))}
                          </select>
                        </label>
                      </td>
                      <td>
                        <textarea
                          className="public-textarea"
                          value={draft.adminNotes}
                          onChange={(e) => updateEdit(item._id, 'adminNotes', e.target.value)}
                          style={{ minWidth: 220, minHeight: 90 }}
                        />
                      </td>
                      <td>
                        <div className="admin-inline-actions">
                          <button onClick={() => startEdit(item)}>Reset Draft</button>
                          <button className="public-submit" onClick={() => saveEdit(item._id)}>Save</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </AdminGuard>
  );
};

export default AdminSupportInbox;
