// frontend/src/pages/Chats.js
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyChats } from '../api/chatApi';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import { AuthContext } from '../contexts/AuthContext';
import { getStompClient, subscribe, unsubscribe, send } from '../stompClient';

const Chats = () => {
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getMyChats();
        if (!mounted) return;
        setChats(list);
      } catch (e) {
        setError(e.message || 'Failed to load chats');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const truncateMessage = (text, maxLength = 60) => {
    if (!text) return 'No messages yet';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <main className="container">
      <div className="chats-header">
        <div className="chats-title-section">
          <h2>Your Conversations</h2>
          <p className="chats-subtitle">Manage and continue your ongoing chats</p>
        </div>
        {chats.length > 0 && (
          <div className="chats-count">
            <span className="count-badge">{chats.length}</span>
            <span className="count-label">active chats</span>
          </div>
        )}
      </div>

      {error && (
        <div className="status-message error">
          <span className="error-icon">❌</span>
          <p>{error}</p>
        </div>
      )}

      <div className="chats-list">
        {chats.length === 0 ? (
          <Card className="empty-chats">
            <div className="empty-content">
              <div className="empty-icon">💬</div>
              <h3>No conversations yet</h3>
              <p className="muted">
                Start matching with people to begin meaningful conversations!
              </p>
              <div className="empty-actions">
                <Button variant="primary" onClick={() => navigate('/matches')}>
                  🎯 Find Matches
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          chats.map(c => {
            const other = (c.participants || []).find(p => String(p._id || p) !== String(user?._id)) || c.otherParticipant || null;
            const lastMessage = c.lastMessage?.text || (c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : '');
            const isActive = c.status === 'active';
            const unreadCount = c.unreadCount || 0;
            const lastActivity = c.updatedAt || c.lastMessage?.timestamp;

            return (
              <Card 
                key={c._id} 
                className={`chat-item ${!isActive ? 'paused' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`} 
                onClick={() => navigate(`/chat/${c._id}`)}
              >
                <div className="chat-item-content">
                  <div className="chat-avatar">
                    <Avatar 
                      src={other?.profilePhoto} 
                      name={other?.name || other?.displayName || 'User'} 
                      size={60} 
                    />
                    <div className={`status-indicator ${isActive ? 'active' : 'paused'}`} 
                         title={isActive ? 'Chat is active' : 'Chat is paused'}>
                      {isActive ? '🟢' : '⏸️'}
                    </div>
                    {unreadCount > 0 && (
                      <div className="unread-indicator" title={`${unreadCount} unread messages`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="chat-details">
                    <div className="chat-header-row">
                      <div className="chat-participant">
                        <h4>{other?.displayName || other?.name || 'Unknown User'}</h4>
                        <div className="participant-meta">
                          {!isActive && <span className="status-text">⏸️ Paused</span>}
                          {other?.location && (
                            <span className="location-text"> {other.location}</span>
                          )}
                        </div>
                      </div>
                      <div className="chat-meta">
                        <div className="last-message-time">
                          {formatLastMessageTime(lastActivity)}
                        </div>
                        {unreadCount > 0 && (
                          <div className="unread-badge">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="last-message">
                      <p className="message-preview">
                        {truncateMessage(lastMessage)}
                      </p>
                      {!isActive && (
                        <div className="pause-notice">
                          <span className="pause-icon">⏸️</span>
                          This conversation is currently paused
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
};

export default Chats;