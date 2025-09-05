// frontend/src/components/NotificationCenter.js
import React, { useContext, useState } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

const NotificationCenter = () => {
  const { notifications = [], markRead, unreadCount } = useContext(NotificationContext);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const buttonStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    background: hovered ? 'rgba(120,120,120,0.14)' : 'rgba(120,120,120,0.08)',
    border: '1px solid rgba(120,120,120,0.18)',
    color: 'inherit',
    cursor: 'pointer',
    transition: 'transform 140ms ease, background 200ms ease, box-shadow 200ms ease',
    boxShadow: hovered ? '0 6px 18px rgba(0,0,0,0.12)' : '0 3px 10px rgba(0,0,0,0.06)',
    transform: hovered ? 'translateY(-1px)' : 'translateY(0)'
  };

  const badgeStyle = {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    padding: '0 6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    color: '#fff',
    background: 'linear-gradient(135deg, #ff4d4d 0%, #ff7a7a 100%)',
    borderRadius: 999,
    boxShadow: '0 4px 10px rgba(255,77,77,0.35)',
    border: '1px solid rgba(255,255,255,0.5)'
  };

  const panelStyle = {
    position: 'absolute',
    right: 0,
    width: 320,
    maxHeight: 420,
    overflowY: 'auto',
    background: 'white',
    boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
    borderRadius: 14,
    padding: 12,
    zIndex: 1000,
    border: '1px solid rgba(0,0,0,0.06)'
  };

  const itemStyle = {
    padding: 10,
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between'
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginLeft: 12 }}>
      <button
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={buttonStyle}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M14.24 17.999H9.76c-2.76 0-4.16 0-4.76-.59-.6-.59-.6-1.56-.6-3.49 0-3.35 1.83-5.53 3.32-6.58.27-.19.49-.63.56-.94.21-.95 1.04-2.39 2.72-2.39s2.51 1.44 2.72 2.39c.07.31.29.75.56.94 1.49 1.05 3.32 3.23 3.32 6.58 0 1.93 0 2.9-.6 3.49-.6.59-2 .59-4.8.59Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 20.5c.4.9 1.26 1.5 2.24 1.5s1.84-.6 2.24-1.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {unreadCount > 0 && (
          <span style={badgeStyle}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={panelStyle}>
          <h4 style={{ margin: '4px 6px 10px', fontSize: 16 }}>Notifications</h4>
          {notifications.length === 0 ? (
            <p style={{ color: '#666' }}>No notifications</p>
          ) : (
            notifications.map((n) => (
              <div key={n._id} style={itemStyle}>
                <div style={{ maxWidth: 220 }}>
                  <div style={{ fontWeight: n.read ? 400 : 700 }}>{n.title || n.type}</div>
                  <div style={{ fontSize: 13, color: '#444' }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.read && (
                  <div style={{ marginLeft: 8 }}>
                    <button onClick={() => markRead(n._id)} style={{ fontSize: 12 }}>Mark read</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
