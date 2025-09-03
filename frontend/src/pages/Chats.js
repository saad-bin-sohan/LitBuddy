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
        <h2>Your Conversations</h2>
        {chats.length > 0 && (
          <div className="chats-count">
            <span className="count-badge">{chats.length}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="status-message error">
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
                Start matching with people to begin conversations!
              </p>
            </div>
          </Card>
        ) : (
          chats.map(c => {
            const other = (c.participants || []).find(p => String(p._id || p) !== String(user?._id)) || c.otherParticipant || null;
            const lastMessage = c.lastMessage?.text || (c.messages && c.messages.length ? c.messages[c.messages.length - 1].text : '');
            const isActive = c.status === 'active';
            const unreadCount = c.unreadCount || 0;

            return (
              <Card 
                key={c._id} 
                className={`chat-item ${!isActive ? 'paused' : ''}`} 
                onClick={() => navigate(`/chat/${c._id}`)}
              >
                <div className="chat-item-content">
                  <div className="chat-avatar">
                    <Avatar 
                      src={other?.profilePhoto} 
                      name={other?.name || other?.displayName || 'User'} 
                      size={56} 
                    />
                    {!isActive && <div className="status-indicator paused" title="Chat is paused" />}
                    {isActive && <div className="status-indicator active" title="Chat is active" />}
                  </div>

                  <div className="chat-details">
                    <div className="chat-header-row">
                      <div className="chat-participant">
                        <h4>{other?.displayName || other?.name || 'Unknown User'}</h4>
                        {!isActive && <span className="status-text">Paused</span>}
                      </div>
                      <div className="chat-meta">
                        <div className="last-message-time">
                          {formatLastMessageTime(c.updatedAt)}
                        </div>
                        {unreadCount > 0 && (
                          <div className="unread-badge">{unreadCount}</div>
                        )}
                      </div>
                    </div>

                    <div className="last-message">
                      <p className="message-preview">
                        {truncateMessage(lastMessage)}
                      </p>
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