// frontend/src/components/ReportForm.js
/**
 * ReportForm React component
 *
 * Usage:
 *  <ReportForm
 *    reportedUserId={userId}            // optional: profile user id
 *    messageContext={{ id: msgId }}     // optional: for reporting a specific message
 *    initialDescription="..."            // optional: prefill description (e.g. message excerpt)
 *    onSuccess={(created) => { ... }}   // optional callback
 *    onCancel={() => { ... }}           // optional callback (useful for inline modal)
 *    inline={true}                      // optional, for small modal styling or behaviour
 *  />
 *
 * Behavior:
 *  - Structured fields: context, category, severity, description
 *  - Optional evidence uploads (images & pdfs) with previews
 *  - Upload progress UI (via submitReport's onProgress)
 *  - Uses submitReport helper which targets REACT_APP_BACKEND_URL or default backend
 *  - Client-side validation & size/type checks
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { submitReport } from '../api/reportApi';

const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const CATEGORIES = [
  { value: 'harassment', label: 'Harassment / Hate speech' },
  { value: 'spam', label: 'Spam / Scam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake', label: 'Fake profile / impersonation' },
  { value: 'other', label: 'Other' },
];

const SEVERITY = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function humanFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ReportForm({
  reportedUserId,
  messageContext,
  initialDescription = '',
  onSuccess,
  onCancel,
  inline = false,
}) {
  // default context: message if a messageContext.id is provided, else profile when reportedUserId exists
  const [contextType, setContextType] = useState(
    messageContext?.id ? 'message' : (reportedUserId ? 'profile' : 'other')
  );
  const [reportedId, setReportedId] = useState(reportedUserId || '');
  const [messageId, setMessageId] = useState(messageContext?.id || '');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState(initialDescription || '');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const maxFiles = DEFAULT_MAX_FILES;
  const maxSize = DEFAULT_MAX_SIZE;

  // previews (object URLs)
  useEffect(() => {
    const p = files.map((f) => {
      if (f.type && f.type.startsWith('image/')) {
        return { url: URL.createObjectURL(f), name: f.name, isImage: true, file: f };
      }
      return { url: null, name: f.name, isImage: false, file: f };
    });
    // revoke old urls on cleanup
    setPreviews((prev) => {
      // revoke old ones
      prev.forEach((x) => x && x.url && URL.revokeObjectURL(x.url));
      return p;
    });

    return () => {
      p.forEach((x) => x && x.url && URL.revokeObjectURL(x.url));
    };
  }, [files]);

  const handleFiles = (incomingFiles) => {
    setError('');
    if (!incomingFiles) return;
    const arr = Array.from(incomingFiles);
    if (arr.length + files.length > maxFiles) {
      setError(`You may upload up to ${maxFiles} files total.`);
      return;
    }
    for (const f of arr) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError(`Unsupported file type: ${f.name}`);
        return;
      }
      if (f.size > maxSize) {
        setError(`${f.name} is too large (${humanFileSize(f.size)}). Max is ${humanFileSize(maxSize)}.`);
        return;
      }
    }
    setFiles((prev) => [...prev, ...arr]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setDescription('');
    setCategory('');
    setSeverity('medium');
    setError('');
    setUploadPercent(0);
  };

  // main submit
  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    // validation
    if (!category) return setError('Please select a category.');
    if (!description || description.trim().length < 10) return setError('Please provide a more detailed description (min 10 chars).');
    if (!contextType) return setError('Please select a context (profile, message or other).');
    if (contextType === 'profile' && !reportedId) return setError('Please provide the profile id or email of the user you are reporting.');
    if (contextType === 'message' && !messageId) return setError('Please provide the message id.');

    setSubmitting(true);
    setUploadPercent(0);

    try {
      const fd = new FormData();
      fd.append('category', category);
      fd.append('severity', severity);
      fd.append('description', description.trim());
      fd.append('context', contextType);

      if (contextType === 'profile') {
        fd.append('reportedUser', reportedId);
      } else if (contextType === 'message') {
        // reportedUser preferably provided; if not, backend can infer from messageId
        if (reportedId) fd.append('reportedUser', reportedId);
        fd.append('messageId', messageId);
      }

      // attach files under 'evidence'
      files.forEach((f) => fd.append('evidence', f, f.name));

      // call API helper which will send to backend (and supports upload progress)
      const result = await submitReport(fd, {
        onProgress: (pct) => {
          setUploadPercent(pct);
        },
      });

      // success handling
      setSubmitting(false);
      setUploadPercent(100);
      // reset small time after success
      setTimeout(() => setUploadPercent(0), 700);

      // reset form (keep reported id for convenience in some cases)
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setCategory('');
      setSeverity('medium');
      setDescription('');
      // call success callback with created report
      if (typeof onSuccess === 'function') {
        try { onSuccess(result); } catch (_) {}
      } else {
        // fallback friendly feedback
        try { window.alert('Report submitted. Moderators will review it shortly.'); } catch (_) {}
      }
    } catch (err) {
      // err may be Error instance or string
      const msg = (err && err.message) ? err.message : String(err || 'Failed to submit report');
      setError(msg);
      setSubmitting(false);
      setUploadPercent(0);
    }
  };

  return (
    <form className={`report-form${inline ? ' inline' : ''}`} onSubmit={submit} style={{ maxWidth: 820 }}>
      {error && <div style={{ marginBottom: 12, color: 'var(--danger)' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 12 }}>
        <label>
          Context
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name="context"
                checked={contextType === 'profile'}
                onChange={() => setContextType('profile')}
              />
              <span>Profile</span>
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name="context"
                checked={contextType === 'message'}
                onChange={() => setContextType('message')}
              />
              <span>Message</span>
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name="context"
                checked={contextType === 'other'}
                onChange={() => setContextType('other')}
              />
              <span>Other</span>
            </label>
          </div>
        </label>

        {contextType === 'profile' && (
          <label>
            Reported profile ID or email
            <input
              className="input"
              type="text"
              placeholder="user id or email"
              value={reportedId}
              onChange={(e) => setReportedId(e.target.value)}
              disabled={!!reportedUserId} // protect prefilled id
            />
            <small className="muted">Use the profile's ID or email to identify the user (prefilled if available).</small>
          </label>
        )}

        {contextType === 'message' && (
          <>
            <label>
              Message ID (required)
              <input className="input" type="text" placeholder="message id" value={messageId} onChange={(e) => setMessageId(e.target.value)} />
            </label>
            <label>
              Reported user's ID (recommended)
              <input className="input" type="text" placeholder="reported user's id" value={reportedId} onChange={(e) => setReportedId(e.target.value)} />
            </label>
          </>
        )}

        <label>
          Category
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label>
          Severity
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITY.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        <label>
          Description (what happened? include timestamps, message excerpts, links)
          <textarea
            className="input"
            rows={5}
            placeholder="Describe the behavior or message. Include as many details as possible."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <label>
          Evidence (optional) — images / PDF, up to {maxFiles} files, max {humanFileSize(maxSize)} each
          <input
            ref={fileInputRef}
            className="input"
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            disabled={submitting}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {previews.map((p, idx) => (
              <div key={idx} style={{ width: 140, border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                {p.isImage ? (
                  <img src={p.url} alt={p.name} style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 4 }} />
                ) : (
                  <div style={{ height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>[PDF]</div>
                )}
                <div style={{ fontSize: 12, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => removeFile(idx)}
                    disabled={submitting}
                    aria-label={`Remove ${p.name}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </label>

        {uploadPercent > 0 && (
          <div>
            <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${uploadPercent}%`, height: 8, background: 'var(--accent)' }} />
            </div>
            <small>{uploadPercent}%</small>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              clearAll();
              if (onCancel) onCancel();
            }}
            disabled={submitting}
          >
            {inline ? 'Close' : 'Clear'}
          </button>
        </div>
      </div>
    </form>
  );
}

ReportForm.propTypes = {
  reportedUserId: PropTypes.string,
  messageContext: PropTypes.shape({
    id: PropTypes.string,
  }),
  initialDescription: PropTypes.string,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
  inline: PropTypes.bool,
};
