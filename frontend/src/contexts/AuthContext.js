import React, { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getMyProfile } from '../api/profileApi';
import {
  login as loginRequest,
  register as registerRequest,
  logout as logoutRequest,
} from '../api/authApi';
import { clearLegacyTokenOnce } from '../api/httpClient';

export const AuthContext = createContext({
  user: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  markProfileComplete: async () => {},
});

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

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

  const login = useCallback(async ({ email, password, deviceId }) => {
    try {
      setLoading(true);
      const data = await loginRequest({ email, password, deviceId });
      const nextUser = data?.user || null;
      setUser(nextUser);
      setIsProfileComplete(!!nextUser?.hasCompletedSetup);
      return { success: true, user: nextUser };
    } catch (error) {
      if (error?.body?.otpRequired) {
        return { otpRequired: true, methods: error.body.methods || [] };
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    try {
      setLoading(true);
      const data = await registerRequest(formData);
      const nextUser = data?.user || null;
      setUser(nextUser);
      setIsProfileComplete(!!nextUser?.hasCompletedSetup);
      return { success: true, user: nextUser };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setIsProfileComplete(false);
    }
  }, []);

  const markProfileComplete = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  const isAdmin = !!(user && (user.isAdmin || user.role === 'admin'));

  useEffect(() => {
    clearLegacyTokenOnce();
    (async () => {
      try {
        await refreshUser();
      } catch {
        // no active session
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
