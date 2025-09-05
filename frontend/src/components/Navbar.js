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
import { FiLogOut, FiMessageSquare, FiMenu, FiSun, FiMoon, FiX, FiUser, FiSettings, FiBookOpen, FiUsers, FiSearch, FiAward, FiTrendingUp } from 'react-icons/fi';
import { AuthContext } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import Avatar from './Avatar';

const Navbar = () => {
  const { user, setUser, logout, isAdmin } = useContext(AuthContext);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const profileDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    // Ensure we set the attribute that your CSS file reads:
    const attrValue = theme === 'dark' ? 'dark' : 'light';

    try {
      // Primary attribute used in styles.css
      document.documentElement.setAttribute('data-color-scheme', attrValue);
      // Keep existing attribute (backwards compatibility)
      document.documentElement.setAttribute('data-theme', attrValue);
      // Helps native form controls & some UA styling match the chosen theme
      document.documentElement.style.colorScheme = attrValue;
    } catch (err) {
      // noop in environments where document isn't available
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

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
        try { localStorage.removeItem('token'); } catch (_) {}
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
    <header className="modern-navbar animate-slide-in-top">
      <div className="nav-container">
        {/* Brand Section */}
        <div className="nav-brand">
          <Link to="/" className="brand-link hover-scale">
            <div className="brand-logo animate-pulse">
              <img src="/logo.png" alt="LitBuddy Logo" className="logo-image" />
              <div className="logo-glow animate-glow"></div>
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
            className={`nav-link hover-lift ${isActive('/') ? 'active' : ''}`}
          >
            <FiBookOpen className="nav-icon" />
            <span>Home</span>
          </Link>
          <Link 
            to="/suggestions" 
            className={`nav-link hover-lift ${isActive('/suggestions') ? 'active' : ''}`}
          >
            <FiSearch className="nav-icon" />
            <span>Discover</span>
          </Link>
          <Link 
            to="/matches" 
            className={`nav-link hover-lift ${isActive('/matches') ? 'active' : ''}`}
          >
            <FiUsers className="nav-icon" />
            <span>Matches</span>
          </Link>
        </nav>

        {/* Right Side Actions */}
        <div className="nav-actions">
          {/* Theme Toggle */}
          <button
            className="theme-toggle hover-scale"
            title="Toggle theme"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle theme"
          >
            <div className="theme-icon animate-pulse">
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </div>
            <div className="theme-ripple animate-glow"></div>
          </button>

          {/* User Actions */}
          {user ? (
            <>
              {/* Notifications */}
              <div className="notification-wrapper">
                <NotificationCenter />
              </div>

              {/* Chats Link */}
              <Link to="/chats" className="nav-action-btn chats-btn" title="Chats" aria-label="Chats">
                <FiMessageSquare />
                <span className="action-label">Chats</span>
              </Link>

              {/* Reading Progress Link */}
              <Link to="/reading-progress" className="nav-action-btn reading-btn" title="Reading Progress" aria-label="Reading Progress">
                <FiBookOpen />
                <span className="action-label">Reading</span>
              </Link>

              {/* Challenges Link */}
              <Link to="/challenges" className="nav-action-btn challenges-btn" title="Reading Challenges" aria-label="Reading Challenges">
                <FiAward />
                <span className="action-label">Challenges</span>
              </Link>

              {/* Achievements Link */}
              <Link to="/achievements" className="nav-action-btn achievements-btn" title="Achievements" aria-label="Achievements">
                <FiTrendingUp />
                <span className="action-label">Achievements</span>
              </Link>

              {/* Profile Dropdown */}
              <div className="profile-dropdown" ref={profileDropdownRef}>
                <button
                  className="profile-trigger"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-label="Open profile menu"
                  aria-expanded={isProfileDropdownOpen}
                >
                  <Avatar src={avatarSrc} name={user.displayName || user.name} size={40} />
                  <div className="profile-info">
                    <div className="profile-name">
                      {user.displayName || user.name}
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
                      
                      {isAdmin && (
                        <Link 
                          to="/admin/reports" 
                          className="dropdown-item admin-item"
                          onClick={() => setIsProfileDropdownOpen(false)}
                        >
                          <FiSettings />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                      
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
            className="mobile-menu-toggle"
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
