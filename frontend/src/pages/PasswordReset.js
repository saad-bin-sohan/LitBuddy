// frontend/src/pages/PasswordReset.js

import React, { useState, useEffect } from 'react';
import { resetPassword } from '../api/passwordApi';
import { useSearchParams, useNavigate } from 'react-router-dom';

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
    <div style={{ maxWidth: 600, margin: 'auto' }}>
      <h2>Set a new password</h2>

      {status && <p style={{ color: status.type === 'success' ? 'green' : 'red' }}>{status.text}</p>}

      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

        <label>New password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

        <label>Confirm password</label>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" required />

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button>
        </div>
      </form>
    </div>
  );
};

export default PasswordReset;
