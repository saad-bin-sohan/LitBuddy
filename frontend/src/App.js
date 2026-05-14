// frontend/src/App.js
import React, { useContext, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthContext } from './contexts/AuthContext';
import { GOOGLE_CLIENT_ID, IS_GOOGLE_AUTH_ENABLED } from './api/httpClient';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const MatchSuggestions = lazy(() => import('./pages/MatchSuggestions'));
const Matches = lazy(() => import('./pages/Matches'));
const Chat = lazy(() => import('./pages/Chat'));
const ReportUser = lazy(() => import('./pages/ReportUser'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const ProfileView = lazy(() => import('./pages/ProfileView'));
const Chats = lazy(() => import('./pages/Chats'));
const ReadingProgress = lazy(() => import('./pages/ReadingProgress'));
const CreateBook = lazy(() => import('./pages/CreateBook'));
const SearchBooks = lazy(() => import('./pages/SearchBooks'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Achievements = lazy(() => import('./pages/Achievements'));
const BookDetailsPage = lazy(() => import('./pages/BookDetailsPage'));
const AddReview = lazy(() => import('./pages/AddReview'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const CareerDetailsPage = lazy(() => import('./pages/CareerDetailsPage'));
const PressKitPage = lazy(() => import('./pages/PressKitPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));
const CommunityGuidelinesPage = lazy(() => import('./pages/CommunityGuidelinesPage'));
const AdminContent = lazy(() => import('./pages/AdminContent'));
const AdminSupportInbox = lazy(() => import('./pages/AdminSupportInbox'));
const PasswordResetRequest = lazy(() => import('./pages/PasswordResetRequest'));
const PasswordReset = lazy(() => import('./pages/PasswordReset'));
const ClubList = lazy(() => import('./pages/ClubList'));
const ClubDetails = lazy(() => import('./pages/ClubDetails'));
const GroupChat = lazy(() => import('./pages/GroupChat'));
const ClubCreationForm = lazy(() => import('./pages/ClubCreationForm'));

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

// Guards a route that requires the user to be logged in.
// Shows a spinner while auth state is being determined.
// Redirects to /login if auth resolves and there is no user.
const PrivateRoute = ({ element }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <LoadingSpinner text="Loading..." />
    </div>
  );
  return user ? element : <Navigate to="/login" replace />;
};

// Guards a route that requires admin access.
// Shows a spinner while auth state is being determined.
// Redirects to / if auth resolves and the user is not an admin.
const AdminRoute = ({ element }) => {
  const { isAdmin, loading } = useContext(AuthContext);
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <LoadingSpinner text="Loading..." />
    </div>
  );
  return isAdmin ? element : <Navigate to="/" replace />;
};

const App = () => {
  const { user, loading, isProfileComplete, isAdmin } = useContext(AuthContext);

  const appContent = (
    <Router>
      <AuthRedirectWrapper>
        <Navbar />
        <main className="main-content">
        <ErrorBoundary>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
              <LoadingSpinner text="Loading..." />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />

              {/* Auth */}
              <Route
                path="/login"
                element={
                  loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                      <LoadingSpinner text="Loading..." />
                    </div>
                  ) : !user ? (
                    <Login />
                  ) : (
                    <Navigate to={isProfileComplete ? '/' : '/profile-setup'} replace />
                  )
                }
              />
              <Route
                path="/register"
                element={
                  loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                      <LoadingSpinner text="Loading..." />
                    </div>
                  ) : !user ? (
                    <Register />
                  ) : (
                    <Navigate to={isProfileComplete ? '/' : '/profile-setup'} replace />
                  )
                }
              />

              {/* Profile routes */}
              <Route
                path="/profile-setup"
                element={
                  loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                      <LoadingSpinner text="Loading..." />
                    </div>
                  ) : user ? (
                    isProfileComplete ? <Navigate to="/my-profile" replace /> : <ProfileSetup />
                  ) : (
                    <Navigate to="/login" />
                  )
                }
              />
              <Route
                path="/my-profile"
                element={
                  loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                      <LoadingSpinner text="Loading..." />
                    </div>
                  ) : user ? (
                    isProfileComplete ? <ProfileView /> : <Navigate to="/profile-setup" replace />
                  ) : (
                    <Navigate to="/login" />
                  )
                }
              />

              {/* User features */}
              <Route path="/suggestions" element={<PrivateRoute element={<MatchSuggestions />} />} />
              <Route path="/matches" element={<PrivateRoute element={<Matches />} />} />
              <Route path="/chat/:chatId" element={<PrivateRoute element={<Chat />} />} />
              <Route path="/chats" element={<PrivateRoute element={<Chats />} />} />
              <Route path="/report/:userId" element={<PrivateRoute element={<ReportUser />} />} />

              {/* Reading Progress */}
              <Route path="/reading-progress" element={<PrivateRoute element={<ReadingProgress />} />} />
              <Route path="/create-book" element={<PrivateRoute element={<CreateBook />} />} />
              <Route path="/search-books" element={<PrivateRoute element={<SearchBooks />} />} />
              <Route path="/add-review" element={<PrivateRoute element={<AddReview />} />} />

              {/* Reading Challenges */}
              <Route path="/challenges" element={<PrivateRoute element={<Challenges />} />} />
              <Route path="/achievements" element={<PrivateRoute element={<Achievements />} />} />

              {/* Book Clubs */}
              <Route path="/clubs" element={<PrivateRoute element={<ClubList />} />} />
              <Route path="/clubs/create" element={<PrivateRoute element={<ClubCreationForm />} />} />
              <Route path="/clubs/:clubId" element={<PrivateRoute element={<ClubDetails />} />} />
              <Route path="/clubs/:clubId/chat" element={<PrivateRoute element={<GroupChat />} />} />
              <Route path="/clubs/:clubId/chat/:chatId" element={<PrivateRoute element={<GroupChat />} />} />

              {/* Admin */}
              <Route path="/admin/reports" element={<AdminRoute element={<AdminReports />} />} />
              <Route path="/admin/content" element={<AdminRoute element={<AdminContent />} />} />
              <Route path="/admin/support" element={<AdminRoute element={<AdminSupportInbox />} />} />

              {/* Password reset (public) */}
              <Route path="/password-reset-request" element={<PasswordResetRequest />} />
              <Route path="/password-reset" element={<PasswordReset />} />

              {/* Book details (public) */}
              <Route path="/book/:bookId" element={<BookDetailsPage />} />

              {/* Public footer pages */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/careers/:slug" element={<CareerDetailsPage />} />
              <Route path="/press" element={<PressKitPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cookies" element={<CookiePolicyPage />} />
              <Route path="/guidelines" element={<CommunityGuidelinesPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        </main>
        <Footer />
      </AuthRedirectWrapper>
    </Router>
  );

  if (!IS_GOOGLE_AUTH_ENABLED) {
    return appContent;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {appContent}
    </GoogleOAuthProvider>
  );
};

export default App;
