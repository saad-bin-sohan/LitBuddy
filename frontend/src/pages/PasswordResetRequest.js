// frontend/src/pages/PasswordResetRequest.js

import React, { useState } from 'react';
import { requestPasswordReset } from '../api/passwordApi';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const PasswordResetRequest = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      // We are not implementing client-side captcha UI by default (dev-friendly).
      await requestPasswordReset({ email });
      setStatus({ type: 'success', text: 'If an account exists, a password reset link has been sent to that email.' });
      // Optionally navigate to login after a short delay:
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Failed to submit request' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Password reset</h1>
          <p className="auth-subtitle">
            Enter the email associated with your account. If an account exists, we'll email a link to reset your password.
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
            <label htmlFor="password-reset-request-email" className="form-label">Email</label>
            <input
              id="password-reset-request-email"
              className="form-input"
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/login')}>
              Back to login
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetRequest;
