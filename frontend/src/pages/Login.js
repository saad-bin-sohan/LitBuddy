// frontend/src/pages/Login.js

import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { login, requestOtp, loginWithOtp } from '../api/authApi';
import { AuthContext } from '../contexts/AuthContext';

const makeDeviceId = () => {
  // simple unique id
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

const Login = () => {
  const { setUser } = useContext(AuthContext);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // OTP flow state
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpMethods, setOtpMethods] = useState([]); // e.g. ['email','phone']
  const [selectedMethod, setSelectedMethod] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [deviceId, setDeviceId] = useState(null);

  useEffect(() => {
    let did = localStorage.getItem('litbuddy_device');
    if (!did) {
      did = makeDeviceId();
      localStorage.setItem('litbuddy_device', did);
    }
    setDeviceId(did);
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login({ ...form, deviceId });
      // success
      localStorage.setItem('token', data.token);
      setUser(data);
    } catch (err) {
      // if server asked for OTP, err.body.otpRequired will be set
      if (err?.body?.otpRequired) {
        setOtpRequired(true);
        setOtpMethods(err.body.methods || []);
        setSelectedMethod((err.body.methods || [])[0] || '');
      } else {
        setError(err.message || 'Login failed');
      }
    }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    setError('');
    try {
      // request OTP via server; server will use the email to find phone if needed
      await requestOtp({ email: form.email, method: selectedMethod });
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setVerifyingOtp(true);
    setError('');
    try {
      const data = await loginWithOtp({
        email: form.email,
        method: selectedMethod,
        code: otpCode,
        deviceId,
      });
      // success -> token returned
      localStorage.setItem('token', data.token);
      setUser(data);
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div>
      <h2>Login</h2>

      {!otpRequired ? (
        <>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <form onSubmit={handleSubmit}>
  <input
    name="email"
    placeholder="Email"
    value={form.email}
    onChange={handleChange}
    type="email"
    required
  />
  <div style={{ position: 'relative' }}>
    <input
      name="password"
      placeholder="Password"
      value={form.password}
      onChange={handleChange}
      type={showPassword ? 'text' : 'password'}
      required
    />
    <button
      type="button"
      onClick={() => setShowPassword((s) => !s)}
      style={{ marginLeft: '8px' }}
    >
      {showPassword ? 'Hide' : 'Show'}
    </button>
  </div>
  <button type="submit">Login</button>

  {/* ← Add this block right under the Login button */}
  <div style={{ marginTop: 8 }}>
    <Link to="/password-reset-request">Forgot password?</Link>
  </div>
</form>

        </>
      ) : (
        <>
          <p style={{ color: 'orange' }}>
            Suspicious login detected. Please verify with an OTP.
          </p>

          {error && <p style={{ color: 'red' }}>{error}</p>}

          <div style={{ marginBottom: '12px' }}>
            <strong>Choose delivery method:</strong>
            <div>
              {otpMethods.includes('email') && (
                <label style={{ marginRight: '1rem' }}>
                  <input
                    type="radio"
                    name="otpMethod"
                    value="email"
                    checked={selectedMethod === 'email'}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                  />
                  Email
                </label>
              )}
              {otpMethods.includes('phone') && (
                <label style={{ marginRight: '1rem' }}>
                  <input
                    type="radio"
                    name="otpMethod"
                    value="phone"
                    checked={selectedMethod === 'phone'}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                  />
                  Phone (SMS)
                </label>
              )}
            </div>
          </div>

          {!otpSent ? (
            <button onClick={handleSendOtp} disabled={!selectedMethod || sendingOtp}>
              {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
            </button>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ marginTop: '12px' }}>
              <input
                name="otpCode"
                placeholder="Enter OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />
              <button type="submit" disabled={verifyingOtp}>
                {verifyingOtp ? 'Verifying...' : 'Verify OTP & Login'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 8 }}>
            <Link to="/password-reset-request">Forgot password?</Link>
        </div>


          <div style={{ marginTop: '12px' }}>
            <button onClick={() => { setOtpRequired(false); setOtpSent(false); setError(''); }}>
              Cancel
            </button>
          </div>
          <div style={{ marginTop: '12px' }}>
</div>

        </>
      )}
    </div>
  );
};

export default Login;
