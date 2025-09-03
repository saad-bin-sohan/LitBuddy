// frontend/src/components/Navbar.js
/**
 * Navbar (updated)
 *
 * Enhancements:
 *  - Uses logout() from AuthContext if available (preferred).
 *  - Shows an Admin link when the user is an admin.
 *  - Safely reads avatar from either profilePhotos[0] or profilePhoto fallback.
 *  - Adds an admin badge next to the display name for clarity.
 *  - Minor accessibility improvements and aria attributes.
 */

import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiMessageSquare, FiMenu, FiSun, FiMoon } from 'react-icons/fi';
import { AuthContext } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';
import Avatar from './Avatar';

const Navbar = () => {
  const { user, setUser, logout, isAdmin } = useContext(AuthContext);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();

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

  const handleLogout = () => {
    try {
      // Prefer context-provided logout
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
  };

  // Resolve avatar source (support both profilePhoto and profilePhotos array)
  const avatarSrc = user
    ? (user.profilePhotos && user.profilePhotos.length ? user.profilePhotos[0] : (user.profilePhoto || ''))
    : '';

  return (
    <header className="app-navbar">
      <div className="nav-inner">
        <div className="brand">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="logo" aria-hidden>LB</div>
            <div className="title">
              <div className="appname">LitBuddy</div>
              <div className="tag muted">Read • Connect • Chat</div>
            </div>
          </Link>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/suggestions">Discover</Link>
          <Link to="/matches">Matches</Link>
        </nav>

        <div className="nav-actions">
          <button
            className="icon-btn"
            title="Toggle theme"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NotificationCenter />

            {user ? (
              <>
                <Link to="/chats" className="icon-btn" title="Chats" aria-label="Chats">
                  <FiMessageSquare />
                </Link>

                <div
                  className="profile-pill"
                  role="button"
                  onClick={() => navigate(user.hasCompletedSetup ? '/my-profile' : '/profile-setup')}
                  aria-label="Open profile"
                  tabIndex={0}
                >
                  <Avatar src={avatarSrc} name={user.displayName || user.name} size={36} />
                  <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{user.displayName || user.name}</span>
                      {isAdmin && (
                        <span
                          style={{
                            background: 'var(--accent)',
                            color: 'white',
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 12,
                          }}
                          title="Administrator"
                          aria-hidden
                        >
                          Admin
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Active: {user.activeConversations ?? 0}/{user.maxActiveConversations ?? 3}
                    </div>
                  </div>
                </div>

                <button className="icon-btn" title="Logout" onClick={handleLogout} aria-label="Logout">
                  <FiLogOut />
                </button>

                {/* Expose admin quick link */}
                {isAdmin && (
                  <Link to="/admin/reports" className="btn btn-ghost" aria-label="Admin dashboard" style={{ marginLeft: 8 }}>
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">Login</Link>
                <Link to="/register" className="btn btn-primary">Sign up</Link>
              </>
            )}
          </div>

          <button className="icon-btn" style={{ marginLeft: 6 }} aria-label="menu">
            <FiMenu />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
