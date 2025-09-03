// frontend/src/App.js
import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import MatchSuggestions from './pages/MatchSuggestions';
import Matches from './pages/Matches';
import Chat from './pages/Chat';
import ReportUser from './pages/ReportUser';
import AdminReports from './pages/AdminReports';
import { AuthContext } from './contexts/AuthContext';
import ProfileView from './pages/ProfileView';
import Chats from './pages/Chats';

// NEW pages for password reset
import PasswordResetRequest from './pages/PasswordResetRequest';
import PasswordReset from './pages/PasswordReset';

// 🔑 Component wrapper to handle auto-redirect for first-time setup
const AuthRedirectWrapper = ({ children }) => {
  const { user, isProfileComplete } = useContext(AuthContext); // Add isProfileComplete
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect to home page only if the user is logged in and their profile setup is complete
    if (user && isProfileComplete && location.pathname === '/profile-setup') {
      navigate('/', { replace: true });
    }
  }, [user, isProfileComplete, location.pathname, navigate]);

  return children;
};

const App = () => {
  const { user, loading, isProfileComplete } = useContext(AuthContext);

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      <AuthRedirectWrapper>
        <Navbar />
        <main style={{ minHeight: '80vh', padding: '20px' }}>
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Auth */}
            <Route
              path="/login"
              element={
                !user
                  ? <Login />
                  : <Navigate to={isProfileComplete ? '/' : '/profile-setup'} replace />
                }
            />
            <Route
              path="/register"
              element={
                !user
                  ? <Register />
                  : <Navigate to={isProfileComplete ? '/' : '/profile-setup'} replace />
                }
            />

            {/* Profile routes */}
            <Route
              path="/profile-setup"
              element={
                user
                  ? (isProfileComplete ? <Navigate to="/my-profile" replace /> : <ProfileSetup />)
                  : <Navigate to="/login" />
              }
            />
            <Route
              path="/my-profile"
              element={
                user
                  ? (isProfileComplete ? <ProfileView /> : <Navigate to="/profile-setup" replace />)
                  : <Navigate to="/login" />
              }
            />

            {/* User features */}
            <Route path="/suggestions" element={user ? <MatchSuggestions /> : <Navigate to="/login" />} />
            <Route path="/matches" element={user ? <Matches /> : <Navigate to="/login" />} />
            <Route path="/chat/:chatId" element={user ? <Chat /> : <Navigate to="/login" />} />
            <Route path="/chats" element={user ? <Chats /> : <Navigate to="/login" />} />
            <Route path="/report/:userId" element={user ? <ReportUser /> : <Navigate to="/login" />} />

            {/* Admin */}
            <Route path="/admin/reports" element={user?.isAdmin ? <AdminReports /> : <Navigate to="/" />} />

            {/* Password reset (public) */}
            <Route path="/password-reset-request" element={<PasswordResetRequest />} />
            <Route path="/password-reset" element={<PasswordReset />} />
          </Routes>
        </main>
        <Footer />
      </AuthRedirectWrapper>
    </Router>
  );
};

export default App;
