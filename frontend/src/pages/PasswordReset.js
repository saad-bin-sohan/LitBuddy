// frontend/src/pages/PasswordReset.js

import React, { useState, useEffect } from 'react';
import { resetPassword } from '../api/passwordApi';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const PasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emailFromQuery = searchParams.get('email') || '';
  const tokenFromQuery = searchParams.get('token') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(emailFromQuery);
    setToken(tokenFromQuery);
  }, [emailFromQuery, tokenFromQuery]);

  const validatePassword = (pw) => {
    return pw.length >= 6 && /\d/.test(pw) && /[A-Za-z]/.test(pw);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!token || !email) {
      setStatus({ type: 'error', text: 'Missing token or email in URL.' });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (!validatePassword(password)) {
      setStatus({ type: 'error', text: 'Password must be at least 6 characters and contain letters and numbers' });
      return;
    }

    setBusy(true);
    try {
      await resetPassword({ email, token, newPassword: password });
      setStatus({ type: 'success', text: 'Password reset successful — redirecting to login…' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Failed to reset password' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Set a new password</h1>
          <p className="auth-subtitle">
            Choose a new password for your LitBuddy account
          </p>
        </div>

        {status && (
          <div className={status.type === 'success' ? 'auth-success' : 'auth-error'}>
            <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
              {status.type === 'success' ? (
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              ) : (
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              )}
            </svg>
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label htmlFor="password-reset-email" className="form-label">Email</label>
            <input
              id="password-reset-email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password-reset-new" className="form-label">New password</label>
            <input
              id="password-reset-new"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password-reset-confirm" className="form-label">Confirm password</label>
            <input
              id="password-reset-confirm"
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <Button type="submit" variant="primary" className="auth-submit-btn" disabled={busy}>
            {busy ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;
