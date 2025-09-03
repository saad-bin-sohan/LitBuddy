// frontend/src/pages/Chats.js
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyChats } from '../api/chatApi';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
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
      <div className="chats-header-modern">
        <div className="chats-title-section-modern">
          <h2>Your Conversations</h2>
          <p className="chats-subtitle-modern">Manage and continue your ongoing chats</p>
        </div>
        {chats.length > 0 && (
          <div className="chats-count-modern">
            <span className="count-badge-modern">{chats.length}</span>
            <span className="count-label-modern">active chats</span>
          </div>
        )}
      </div>

      {error && (
        <div className="status-message-modern error">
          <span className="error-icon">❌</span>
          <p>{error}</p>
        </div>
      )}

      <div className="chats-list-modern">
        {chats.length === 0 ? (
          <Card className="empty-chats-modern">
            <div className="empty-content-modern">
              <div className="empty-icon-modern">💬</div>
              <h3>No conversations yet</h3>
              <p className="muted">
                Start matching with people to begin meaningful conversations!
              </p>
              <div className="empty-actions-modern">
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
                className={`chat-item-modern ${!isActive ? 'paused' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`} 
                onClick={() => navigate(`/chat/${c._id}`)}
              >
                <div className="chat-item-content-modern">
                  <div className="chat-avatar-modern">
                    <Avatar 
                      src={other?.profilePhoto} 
                      name={other?.name || other?.displayName || 'User'} 
                      size={64} 
                    />
                    <div className={`status-indicator-modern ${isActive ? 'active' : 'paused'}`} 
                         title={isActive ? 'Chat is active' : 'Chat is paused'}>
                      <div className="status-dot"></div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="unread-indicator-modern" title={`${unreadCount} unread messages`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="chat-details-modern">
                    <div className="chat-header-row-modern">
                      <div className="chat-participant-modern">
                        <h4>{other?.displayName || other?.name || 'Unknown User'}</h4>
                        <div className="participant-meta-modern">
                          {!isActive && <span className="status-text-modern">⏸️ Paused</span>}
                          {other?.location && (
                            <span className="location-text-modern">📍 {other.location}</span>
                          )}
                        </div>
                      </div>
                      <div className="chat-meta-modern">
                        <div className="last-message-time-modern">
                          {formatLastMessageTime(lastActivity)}
                        </div>
                        {unreadCount > 0 && (
                          <div className="unread-badge-modern">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="last-message-modern">
                      <p className="message-preview-modern">
                        {truncateMessage(lastMessage)}
                      </p>
                      {!isActive && (
                        <div className="pause-notice-modern">
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