// frontend/src/components/AdminGuard.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

/**
 * AdminGuard
 *
 * - Uses the derived `isAdmin` value from AuthContext instead of checking user.isAdmin directly.
 * - While loading, renders null (avoid flicker); unauthenticated users -> /login;
 *   authenticated non-admins -> fallback (default '/').
 */
const AdminGuard = ({ children, fallbackTo = '/' }) => {
  const { user, loading, isAdmin } = useContext(AuthContext);

  // While auth is being determined, render nothing (or a spinner if you prefer)
  if (loading) return null;

  // Not logged in -> redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Not admin -> redirect to fallback
  if (!isAdmin) {
    return <Navigate to={fallbackTo} replace />;
  }

  // Admin -> render children
  return <>{children}</>;
};

export default AdminGuard;
