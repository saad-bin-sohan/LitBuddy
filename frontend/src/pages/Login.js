// frontend/src/pages/Login.js

import React, { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { login, requestOtp, loginWithOtp } from '../api/authApi';
import { AuthContext } from '../contexts/AuthContext';
import Button from '../components/Button';

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
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  const handleCancelOtp = () => {
    setOtpRequired(false);
    setOtpSent(false);
    setError('');
    setOtpCode('');
    setSelectedMethod('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">
            Sign in to your LitBuddy account to continue
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="auth-error">
            <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Main Login Form */}
        {!otpRequired ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Field */}
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={form.email}
                onChange={handleChange}
                className="form-input"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="form-field">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-container">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className="form-input password-input"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="eye-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="eye-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="form-field forgot-password-field">
              <Link to="/password-reset-request" className="link-primary forgot-password-link">
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="loading-spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite" />
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite" />
                    </circle>
                  </svg>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        ) : (
          /* OTP Verification Flow */
          <div className="auth-form">
            {/* OTP Header */}
            <div className="otp-header">
              <div className="otp-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" className="shield-icon">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                </svg>
              </div>
              <h3 className="otp-title">Security Verification Required</h3>
              <p className="otp-subtitle">
                We detected an unusual login attempt. Please verify your identity to continue.
              </p>
            </div>

            {/* Error Display for OTP */}
            {error && (
              <div className="auth-error">
                <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* OTP Method Selection */}
            {!otpSent && (
              <div className="form-field">
                <label className="form-label">Choose verification method:</label>
                <div className="otp-methods">
                  {otpMethods.includes('email') && (
                    <label className="otp-method-option">
                      <input
                        type="radio"
                        name="otpMethod"
                        value="email"
                        checked={selectedMethod === 'email'}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="otp-method-radio"
                      />
                      <div className="otp-method-content">
                        <svg className="otp-method-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        <div>
                          <div className="otp-method-title">Email</div>
                          <div className="otp-method-subtitle">Send code to {form.email}</div>
                        </div>
                      </div>
                    </label>
                  )}
                  
                  {otpMethods.includes('phone') && (
                    <label className="otp-method-option">
                      <input
                        type="radio"
                        name="otpMethod"
                        value="phone"
                        checked={selectedMethod === 'phone'}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="otp-method-radio"
                      />
                      <div className="otp-method-content">
                        <svg className="otp-method-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 011.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        <div>
                          <div className="otp-method-title">SMS</div>
                          <div className="otp-method-subtitle">Send code via text message</div>
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Send OTP Button */}
            {!otpSent && (
              <Button
                onClick={handleSendOtp}
                disabled={!selectedMethod || sendingOtp}
                variant="primary"
                className="auth-submit-btn"
              >
                {sendingOtp ? (
                  <>
                    <svg className="loading-spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite" />
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite" />
                      </circle>
                    </svg>
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            )}

            {/* OTP Input Form */}
            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="otp-form">
                <div className="form-field">
                  <label htmlFor="otpCode" className="form-label">
                    Enter verification code
                  </label>
                  <input
                    id="otpCode"
                    name="otpCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="form-input otp-input"
                    required
                    maxLength="6"
                    pattern="[0-9]{6}"
                    autoComplete="one-time-code"
                  />
                  <div className="otp-help-text">
                    We've sent a 6-digit code to your {selectedMethod === 'email' ? 'email' : 'phone'}
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="auth-submit-btn"
                  disabled={verifyingOtp || otpCode.length !== 6}
                >
                  {verifyingOtp ? (
                    <>
                      <svg className="loading-spinner" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                          <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite" />
                          <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite" />
                        </circle>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>
              </form>
            )}

            {/* OTP Action Buttons */}
            <div className="otp-actions">
              <Button
                onClick={handleCancelOtp}
                variant="ghost"
                className="otp-cancel-btn"
              >
                Cancel
              </Button>
              
              {otpSent && (
                <Button
                  onClick={handleSendOtp}
                  variant="ghost"
                  className="otp-resend-btn"
                  disabled={sendingOtp}
                >
                  {sendingOtp ? 'Sending...' : 'Resend Code'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="auth-footer">
          <p className="auth-footer-text">
            Don't have an account?{' '}
            <Link to="/register" className="link-primary">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
