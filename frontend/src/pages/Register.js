// frontend/src/pages/Register.js

import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api/authApi';
import { AuthContext } from '../contexts/AuthContext';
import Button from '../components/Button';
import GoogleAuth from '../components/GoogleAuth';

const Register = () => {
  const { setUser } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    age: '',
    gender: '',
    acceptedTerms: false
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!form.acceptedTerms) {
      setError('You must accept the Terms and Conditions to register.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await register(form);
      localStorage.setItem('token', data.token);
      setUser(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">
            Join LitBuddy and start your journey to meaningful connections
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

        {/* Google OAuth Button */}
        <div className="auth-divider">
          <GoogleAuth 
            buttonText="Sign up with Google"
            onError={(error) => setError(error)}
            className="google-auth-btn"
          />
        </div>

        <div className="auth-divider">
          <span className="divider-text">or</span>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Name Field */}
          <div className="form-field">
            <label htmlFor="name" className="form-label">
              
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              className="form-input"
              required
              autoComplete="name"
            />
          </div>

          {/* Email Field */}
          <div className="form-field">
            <label htmlFor="email" className="form-label">
              
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
            />
          </div>

          {/* Phone Field */}
          <div className="form-field">
            <label htmlFor="phone" className="form-label">
              <span className="optional-text"></span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={form.phone}
              onChange={handleChange}
              className="form-input"
              autoComplete="tel"
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
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
                className="form-input password-input"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
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

          {/* Age and Gender Row */}
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="age" className="form-label">
                
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min="18"
                max="100"
                placeholder="Age"
                value={form.age}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="gender" className="form-label">
                
              </label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="form-field checkbox-field">
            <label className="checkbox-label">
              <input
                name="acceptedTerms"
                type="checkbox"
                checked={form.acceptedTerms}
                onChange={handleChange}
                className="checkbox-input"
                required
              />
              <span className="checkbox-custom"></span>
              <span className="checkbox-text">
                I agree to the{' '}
                <Link to="/terms" className="link-primary">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="link-primary">
                  Privacy Policy
                </Link>
              </span>
            </label>
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
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <p className="auth-footer-text">
            Already have an account?{' '}
            <Link to="/login" className="link-primary">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
