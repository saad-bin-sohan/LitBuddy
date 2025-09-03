// frontend/src/components/NotificationCenter.js
import React, { useContext, useState } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';

const NotificationCenter = () => {
  const { notifications = [], markRead, unreadCount } = useContext(NotificationContext);
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginLeft: 12 }}>
      <button onClick={() => setOpen((s) => !s)} style={{ position: 'relative' }} aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -6,
            right: -6,
            background: 'red',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: 12
          }}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          width: 320,
          maxHeight: 400,
          overflowY: 'auto',
          background: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderRadius: 8,
          padding: 12,
          zIndex: 1000,
        }}>
          <h4 style={{ marginTop: 0 }}>Notifications</h4>
          {notifications.length === 0 ? (
            <p style={{ color: '#666' }}>No notifications</p>
          ) : (
            notifications.map((n) => (
              <div key={n._id} style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
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
