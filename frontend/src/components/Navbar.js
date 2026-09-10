// frontend/src/components/Navbar.js
/**
 * Modern Navbar Component
 * 
 * Features:
 * - Beautiful gradient logo and branding
 * - Enhanced navigation with active states
 * - Modern profile dropdown
 * - Smooth animations and transitions
 * - Responsive design with mobile menu
 * - Theme toggle with smooth transitions
 */

import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiLogOut, FiMessageSquare, FiMenu, FiSun, FiMoon, FiX, FiUser, FiSettings, FiBookOpen, FiUsers, FiSearch, FiAward, FiTrendingUp, FiGrid } from 'react-icons/fi';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import NotificationCenter from './NotificationCenter';
import Avatar from './Avatar';

const Navbar = () => {
  const { user, setUser, logout, isAdmin } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    try {
      if (typeof logout === 'function') {
        logout();
      } else {
        setUser?.(null);
      }
    } catch (_) {
      // noop
    }
    navigate('/');
    setIsProfileDropdownOpen(false);
  };

  // Resolve avatar source
  const avatarSrc = user
    ? (user.profilePhotos && user.profilePhotos.length ? user.profilePhotos[0] : (user.profilePhoto || ''))
    : '';

  const isActive = (path) => location.pathname === path;

  return (
    <header className="modern-navbar">
      <div className="nav-container">
        <div className="nav-left">
          {/* Brand Section */}
          <div className="nav-brand">
            <Link to="/" className="brand-link">
              <div className="brand-logo">
                <img src="/logo.png" alt="LitBuddy Logo" className="logo-image" />
                <div className="logo-glow"></div>
              </div>
              <div className="brand-text">
                <div className="brand-name">LitBuddy</div>
                <div className="brand-tagline">Read • Connect • Chat</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="nav-menu" aria-label="Main navigation">
            <Link
              to="/"
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              title="Home"
            >
              <FiBookOpen className="nav-icon" />
              <span className="nav-link-label">Home</span>
            </Link>
            <Link
              to="/suggestions"
              className={`nav-link ${isActive('/suggestions') ? 'active' : ''}`}
              title="Discover"
            >
              <FiSearch className="nav-icon" />
              <span className="nav-link-label">Discover</span>
            </Link>
            <Link
              to="/matches"
              className={`nav-link ${isActive('/matches') ? 'active' : ''}`}
              title="Matches"
            >
              <FiUsers className="nav-icon" />
              <span className="nav-link-label">Matches</span>
            </Link>
            <Link
              to="/clubs"
              className={`nav-link ${isActive('/clubs') ? 'active' : ''}`}
              title="Clubs"
            >
              <FiGrid className="nav-icon" />
              <span className="nav-link-label">Clubs</span>
            </Link>
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="nav-actions">
          {/* Theme Toggle */}
          <button
            className="nav-icon-btn theme-toggle"
            title="Toggle theme"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <div className="theme-icon">
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </div>
            <div className="theme-ripple"></div>
          </button>

          {/* User Actions */}
          {user ? (
            <>
              {/* Notifications */}
              <div className="notification-wrapper">
                <NotificationCenter />
              </div>

              {/* Chats Link */}
              <Link to="/chats" className="nav-icon-btn nav-action-btn chats-btn" title="Chats" aria-label="Chats">
                <FiMessageSquare />
              </Link>

              {/* Reading Progress Link — hidden below the Full tier (>=1440px);
                  still reachable via Quick Links in the profile dropdown. */}
              <Link to="/reading-progress" className="nav-icon-btn nav-action-btn reading-btn" title="Reading Progress" aria-label="Reading Progress">
                <FiBookOpen />
              </Link>

              {/* Challenges Link — hidden below the Full tier (>=1440px);
                  still reachable via Quick Links in the profile dropdown. */}
              <Link to="/challenges" className="nav-icon-btn nav-action-btn challenges-btn" title="Reading Challenges" aria-label="Reading Challenges">
                <FiAward />
              </Link>

              {/* Achievements Link — hidden below the Full tier (>=1440px);
                  still reachable via Quick Links in the profile dropdown. */}
              <Link to="/achievements" className="nav-icon-btn nav-action-btn achievements-btn" title="Achievements" aria-label="Achievements">
                <FiTrendingUp />
              </Link>

              {/* Profile Dropdown */}
              <div className="profile-dropdown" ref={profileDropdownRef}>
                <button
                  className="profile-trigger"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-label="Open profile menu"
                  aria-expanded={isProfileDropdownOpen}
                  title={user.displayName || user.name}
                >
                  <Avatar src={avatarSrc} name={user.displayName || user.name} size={40} />
                  <div className="profile-info">
                    <div className="profile-name">
                      <span className="profile-name-text">{user.displayName || user.name}</span>
                      {isAdmin && <span className="admin-badge">Admin</span>}
                    </div>
                    <div className="profile-status">
                      {user.activeConversations ?? 0}/{user.maxActiveConversations ?? 3} active
                    </div>
                  </div>
                  <div className={`dropdown-arrow ${isProfileDropdownOpen ? 'open' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>

                {isProfileDropdownOpen && (
                  <div className="profile-dropdown-menu">
                    <div className="dropdown-header">
                      <div className="dropdown-user">
                        <Avatar src={avatarSrc} name={user.displayName || user.name} size={48} />
                        <div>
                          <div className="dropdown-name">{user.displayName || user.name}</div>
                          <div className="dropdown-email">{user.email}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="dropdown-actions">
                      <Link 
                        to={user.hasCompletedSetup ? '/my-profile' : '/profile-setup'} 
                        className="dropdown-item"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FiUser />
                        <span>Profile</span>
                      </Link>

                      <hr className="dropdown-divider" />
                      <div className="dropdown-section-label">Quick Links</div>

                      <Link
                        to="/reading-progress"
                        className="dropdown-item"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FiBookOpen />
                        <span>Reading Progress</span>
                      </Link>
                      <Link
                        to="/challenges"
                        className="dropdown-item"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FiAward />
                        <span>Reading Challenges</span>
                      </Link>
                      <Link
                        to="/achievements"
                        className="dropdown-item"
                        onClick={() => setIsProfileDropdownOpen(false)}
                      >
                        <FiTrendingUp />
                        <span>Achievements</span>
                      </Link>

                      {isAdmin && (
                        <>
                          <hr className="dropdown-divider" />
                          <Link 
                            to="/admin/reports" 
                            className="dropdown-item admin-item"
                            onClick={() => setIsProfileDropdownOpen(false)}
                          >
                            <FiSettings />
                            <span>Admin Dashboard</span>
                          </Link>
                        </>
                      )}

                      <hr className="dropdown-divider" />
                      <button className="dropdown-item logout-item" onClick={handleLogout}>
                        <FiLogOut />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="auth-btn login-btn">
                <FiUser />
                <span>Login</span>
              </Link>
              <Link to="/register" className="auth-btn signup-btn">
                <span>Get Started</span>
                <div className="btn-glow"></div>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="nav-icon-btn mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu" ref={mobileMenuRef}>
          <div className="mobile-menu-header">
            <div className="mobile-brand">
              <img src="/logo.png" alt="LitBuddy Logo" className="mobile-logo-image" />
              <span>LitBuddy</span>
            </div>
          </div>
          
          <nav className="mobile-nav">
            <Link to="/" className="mobile-nav-link">
              <FiBookOpen />
              <span>Home</span>
            </Link>
            <Link to="/suggestions" className="mobile-nav-link">
              <FiSearch />
              <span>Discover</span>
            </Link>
            <Link to="/matches" className="mobile-nav-link">
              <FiUsers />
              <span>Matches</span>
            </Link>
            <Link to="/clubs" className="mobile-nav-link">
              <FiGrid />
              <span>Clubs</span>
            </Link>
            {user && (
              <>
                <Link to="/chats" className="mobile-nav-link">
                  <FiMessageSquare />
                  <span>Chats</span>
                </Link>
                <Link to="/reading-progress" className="mobile-nav-link">
                  <FiBookOpen />
                  <span>Reading Progress</span>
                </Link>
                <Link to="/challenges" className="mobile-nav-link">
                  <FiAward />
                  <span>Challenges</span>
                </Link>
                <Link to="/achievements" className="mobile-nav-link">
                  <FiTrendingUp />
                  <span>Achievements</span>
                </Link>
              </>
            )}
          </nav>

          {user ? (
            <div className="mobile-user-section">
              <div className="mobile-user-info">
                <Avatar src={avatarSrc} name={user.displayName || user.name} size={48} />
                <div>
                  <div className="mobile-user-name">{user.displayName || user.name}</div>
                  <div className="mobile-user-status">
                    {user.activeConversations ?? 0}/{user.maxActiveConversations ?? 3} active conversations
                  </div>
                </div>
              </div>
              <div className="mobile-user-actions">
                <Link to={user.hasCompletedSetup ? '/my-profile' : '/profile-setup'} className="mobile-action-btn">
                  <FiUser />
                  <span>Profile</span>
                </Link>
                {isAdmin && (
                  <Link to="/admin/reports" className="mobile-action-btn admin">
                    <FiSettings />
                    <span>Admin</span>
                  </Link>
                )}
                <button className="mobile-action-btn logout" onClick={handleLogout}>
                  <FiLogOut />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mobile-auth">
              <Link to="/login" className="mobile-auth-btn login">
                <FiUser />
                <span>Login</span>
              </Link>
              <Link to="/register" className="mobile-auth-btn signup">
                <span>Get Started</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
