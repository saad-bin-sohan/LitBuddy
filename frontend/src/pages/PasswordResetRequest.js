// frontend/src/pages/PasswordResetRequest.js

import React, { useState } from 'react';
import { requestPasswordReset } from '../api/passwordApi';
import { useNavigate } from 'react-router-dom';

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
    <div style={{ maxWidth: 600, margin: 'auto' }}>
      <h2>Password reset</h2>
      <p>Enter the email associated with your account. If an account exists, we'll email a link to reset your password.</p>

      {status && (
        <p style={{ color: status.type === 'success' ? 'green' : 'red' }}>{status.text}</p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <button type="button" onClick={() => navigate('/login')} style={{ marginLeft: 8 }}>Back to login</button>
        </div>
      </form>
    </div>
  );
};

export default PasswordResetRequest;
