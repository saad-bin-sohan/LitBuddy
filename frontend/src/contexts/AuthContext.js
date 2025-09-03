import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getMyProfile } from '../api/profileApi';
import PropTypes from 'prop-types';

export const AuthContext = createContext({
  user: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  markProfileComplete: async () => {},
  token: null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // Fetch current user from backend
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      setUser(data);
      setIsProfileComplete(!!data?.hasCompletedSetup);
      return data;
    } catch (err) {
      setUser(null);
      setIsProfileComplete(false);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Login
  const login = useCallback(async ({ email, password, deviceId }) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, deviceId }),
        credentials: 'include', // send cookies
      });

      const data = await res.json();
      if (!res.ok) {
        if (data && data.otpRequired) {
          return { otpRequired: true, methods: data.methods || [] };
        }
        throw new Error(data.message || 'Login failed');
      }

      setUser(data.user);
      setIsProfileComplete(!!data.user?.hasCompletedSetup);
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register
  const register = useCallback(async (formData) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include', // send cookies
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      setUser(data.user);
      setIsProfileComplete(!!data.user?.hasCompletedSetup);
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // send cookies
      });
      setUser(null);
      setIsProfileComplete(false);
      setToken(null);
      localStorage.removeItem('token');
    } catch {
      // ignore errors
    }
  }, []);

  const markProfileComplete = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  const isAdmin = !!(user && (user.isAdmin || user.role === 'admin'));

  // On mount: refresh user from backend
  useEffect(() => {
    (async () => {
      try {
        await refreshUser();
      } catch {
        // no session
      }
    })();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        isProfileComplete,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        markProfileComplete,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
