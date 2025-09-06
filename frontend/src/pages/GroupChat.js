import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getGroupChat, sendGroupMessage } from '../api/groupChatApi';
import { subscribe, unsubscribe } from '../stompClient';
import { AuthContext } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import './GroupChat.css';

const GroupChat = () => {
  const { clubId, chatId } = useParams();
  const { user } = useContext(AuthContext);

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef();
  const messageInputRef = useRef();
  const fileInputRef = useRef();
  const subscriptionsRef = useRef([]);

  // Load chat data
  useEffect(() => {
    if (!chatId) return;

    const loadChat = async () => {
      try {
        setLoading(true);
        const chatData = await getGroupChat(chatId);
        setChat(chatData);
        setMessages(chatData.messages || []);
      } catch (err) {
        setStatusMessage(err.message || 'Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [chatId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chatId || !user?._id) return;

    // Subscribe to group chat messages
    const msgSub = subscribe(`/topic/group-chat/${chatId}/messages`, (payload) => {
      console.log('Received group message:', payload);
      if (payload.chatId === chatId && payload.message) {
        setMessages((prev) => [...prev, payload.message]);
      }
    });

    // Subscribe to personal queue for this chat
    const personalMsgSub = subscribe(`/user/${user._id}/queue/group-messages`, (payload) => {
      console.log('Received personal group message:', payload);
      if (payload.chatId === chatId && payload.message) {
        setMessages((prev) => [...prev, payload.message]);
      }
    });

    subscriptionsRef.current = [msgSub, personalMsgSub];

    return () => {
      if (msgSub) unsubscribe(`/topic/group-chat/${chatId}/messages`);
      if (personalMsgSub) unsubscribe(`/user/${user._id}/queue/group-messages`);
      subscriptionsRef.current = [];
    };
  }, [chatId, user?._id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!scrollRef.current) return;
    const t = setTimeout(() => {
      try {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      } catch (_) {}
    }, 40);
    return () => clearTimeout(t);
  }, [messages]);

  const formatSender = (m) => {
    if (!m || !m.sender) return { name: 'System', id: null };
    if (typeof m.sender === 'string') return { name: m.sender, id: m.sender };
    return {
      name: m.sender.displayName || m.sender.name || m.sender.email || 'User',
      id: m.sender._id || m.sender.id || null,
    };
  };

  const handleSend = async (e) => {
    e && e.preventDefault();
    const content = newMessage.trim();
    const hasContent = content || selectedFiles.length > 0;
    if (!hasContent) return;

    try {
      const optimistic = {
        _id: `temp-${Date.now()}`,
        text: content,
        attachments: selectedFiles.map(f => ({
          filename: f.name,
          originalname: f.name,
          mimetype: f.type,
          size: f.size,
          url: '', // Will be filled by backend
        })),
        sender: { _id: user?._id, displayName: user?.displayName || user?.name },
        timestamp: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setNewMessage('');
      setSelectedFiles([]);
      if (messageInputRef.current) messageInputRef.current.style.height = 'auto';

      const res = await sendGroupMessage(chatId, {
        text: content,
        attachments: selectedFiles
      });

      if (res?.messages && Array.isArray(res.messages)) {
        setMessages(res.messages);
      } else if (res?.message) {
        setMessages((prev) => {
          const filtered = prev.filter((m) => !String(m._id).startsWith('temp-'));
          return [...filtered, res.message];
        });
      }
      setStatusMessage('');
    } catch (err) {
      setStatusMessage(err.message || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => !m._optimistic));
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(300, ta.scrollHeight)}px`;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => {
      const isValidType = f.type.startsWith('image/') || f.type === 'application/pdf';
      const isValidSize = f.size <= 8 * 1024 * 1024; // 8MB limit
      return isValidType && isValidSize;
    });
    if (validFiles.length !== files.length) {
      setStatusMessage('Some files were skipped (unsupported type or too large)');
      setTimeout(() => setStatusMessage(''), 3000);
    }
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      setStatusMessage('Message copied to clipboard');
      setTimeout(() => setStatusMessage(''), 2000);
    } catch {
      setStatusMessage('Failed to copy');
      setTimeout(() => setStatusMessage(''), 2000);
    }
  };

  if (loading) {
    return (
      <div className="group-chat-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading group chat...</p>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="group-chat-container">
        <div className="error-state">
          <h2>Chat not found</h2>
          <p>This group chat may not exist or you may not have access to it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group-chat-container">
      <div className="group-chat-header">
        <div className="chat-info">
          <h2>{chat.name}</h2>
          <p>{chat.club?.name} • {chat.participants?.length || 0} members</p>
        </div>
        <div className="chat-actions">
          <Button variant="ghost" onClick={() => window.history.back()}>
            ← Back to Club
          </Button>
        </div>
      </div>

      <div className="group-chat-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Start the conversation!</h3>
            <p>Send the first message to begin this group discussion</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const sender = formatSender(m);
            const mine = sender.id && String(sender.id) === String(user?._id);
            const ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }) : '';
            const msgKey = m._id || `msg-${idx}`;

            return (
              <div
                key={msgKey}
                className={`message-container ${mine ? 'mine' : 'theirs'}`}
              >
                {!mine && (
                  <div className="message-avatar">
                    <Avatar
                      size={36}
                      name={sender.name}
                      className="avatar-theirs"
                    />
                  </div>
                )}

                <div className="message-content">
                  <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
                    {!mine && (
                      <div className="message-sender">
                        {sender.name}
                      </div>
                    )}

                    <div className="message-text">
                      {m.text}
                    </div>

                    {/* Attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="message-attachments">
                        {m.attachments.map((attachment, idx) => (
                          <div key={idx} className="attachment-item">
                            {attachment.mimetype.startsWith('image/') ? (
                              <div className="image-attachment-container">
                                <img
                                  src={attachment.url}
                                  alt={attachment.originalname}
                                  className="attachment-image"
                                  onClick={() => window.open(attachment.url, '_blank')}
                                  style={{ maxWidth: '200px', maxHeight: '200px', cursor: 'pointer', borderRadius: '8px' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <div className="image-error" style={{ display: 'none', color: '#666', fontSize: '12px' }}>
                                  Image failed to load
                                </div>
                                <div className="attachment-actions">
                                  <button
                                    type="button"
                                    className="download-btn"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(attachment.url);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = attachment.originalname;
                                        link.click();
                                        window.URL.revokeObjectURL(url);
                                      } catch (error) {
                                        console.error('Download failed:', error);
                                        setStatusMessage('Download failed');
                                        setTimeout(() => setStatusMessage(''), 3000);
                                      }
                                    }}
                                    title="Download image"
                                  >
                                    ⬇️
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="file-attachment-container">
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="attachment-link"
                                  download={attachment.originalname}
                                >
                                  📄 {attachment.originalname}
                                </a>
                                <div className="attachment-actions">
                                  <button
                                    type="button"
                                    className="download-btn"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(attachment.url);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = attachment.originalname;
                                        link.click();
                                        window.URL.revokeObjectURL(url);
                                      } catch (error) {
                                        console.error('Download failed:', error);
                                        setStatusMessage('Download failed');
                                        setTimeout(() => setStatusMessage(''), 3000);
                                      }
                                    }}
                                    title="Download file"
                                  >
                                    ⬇️
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="message-footer">
                      <div className="message-time">{ts}</div>

                      <div className="message-actions">
                        <button
                          type="button"
                          className="action-button copy-btn"
                          title="Copy message"
                          onClick={() => copyToClipboard(m.text || '')}
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="message-composer">
        <form onSubmit={handleSend} className="composer-form">
          <div className="composer-input-wrapper">
            <textarea
              ref={messageInputRef}
              className="message-input"
              placeholder="Type your message here..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows="1"
            />
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="selected-files-preview">
              {selectedFiles.map((file, index) => (
                <div key={index} className="file-preview-item">
                  <span className="file-name">{file.name}</span>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="composer-actions">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Button
              type="button"
              variant="ghost"
              className="attach-button"
              onClick={openFileDialog}
              title="Attach files (images or PDFs)"
            >
              <span className="attach-icon">📎</span>
              Attach
            </Button>

            <Button
              type="submit"
              className="send-button"
              disabled={(!newMessage.trim() && selectedFiles.length === 0)}
            >
              <span className="send-icon">💬</span>
              Send
            </Button>
          </div>
        </form>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`status-message ${statusMessage.includes('Failed') ? 'error' : 'success'}`} role="status" aria-live="polite">
          <span className="status-icon">
            {statusMessage.includes('Failed') ? '❌' : '✅'}
          </span>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default GroupChat;
