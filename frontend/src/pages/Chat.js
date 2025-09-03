// frontend/src/pages/Chat.js
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getChatMessages, sendMessage, pauseChat, resumeChat } from '../api/chatApi';
import { subscribe, unsubscribe } from '../stompClient';
import { AuthContext } from '../contexts/AuthContext';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import ReportButton from '../components/ReportButton';
import ReportForm from '../components/ReportForm';

const Chat = () => {
  const { chatId } = useParams();
  const { user, refreshUser } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [chatMeta, setChatMeta] = useState({
    status: 'active',
    pausedBy: null,
    pausedAt: null,
    participants: [],
    name: '',
  });
  const [loading, setLoading] = useState(false);

  // Inline report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState({
    reportedUserId: null,
    messageId: null,
    messageText: '',
    mode: 'user',
  });

  const lastLocalStatusChangeRef = useRef(null);
  const scrollRef = useRef();
  const messageInputRef = useRef();
  const subscriptionsRef = useRef([]);

  // --- Helpers ---
  const formatSender = (m) => {
    if (!m || !m.sender) return { name: 'System', id: null };
    if (typeof m.sender === 'string') return { name: m.sender, id: m.sender };
    return {
      name: m.sender.displayName || m.sender.name || m.sender.email || 'User',
      id: m.sender._id || m.sender.id || null,
    };
  };

  const derivePartnerId = useCallback(() => {
    if (chatMeta?.participants?.length === 2) {
      const other = chatMeta.participants.find((p) => String(p) !== String(user?._id));
      if (other) return typeof other === 'object' ? (other._id || other.id) : other;
    }
    for (const m of messages) {
      const s = formatSender(m);
      if (s.id && String(s.id) !== String(user?._id)) return s.id;
    }
    return null;
  }, [chatMeta, messages, user]);

  const partnerId = derivePartnerId();

  // --- Lifecycle: load messages + subscribe ---
  useEffect(() => {
    if (!chatId || !user?._id) return;
    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        const data = await getChatMessages(chatId);
        if (!mounted) return;

        // Handle the response structure from your backend
        if (data.messages) {
          setMessages(data.messages);
        }
        if (data.status || data.pausedBy || data.pausedAt) {
          setChatMeta((cm) => ({ 
            ...cm, 
            status: data.status || cm.status,
            pausedBy: data.pausedBy || cm.pausedBy,
            pausedAt: data.pausedAt ? new Date(data.pausedAt) : cm.pausedAt,
            participants: data.participants || cm.participants,
            name: data.name || cm.name
          }));
        }
      } catch (err) {
        if (mounted) setStatusMessage(err.message || 'Failed to load messages');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Subscribe to STOMP topics
    const msgSub = subscribe(`/topic/chat/${chatId}/messages`, (payload) => {
      console.log('Received STOMP message:', payload);
      if (payload.chatId === chatId && payload.message) {
        setMessages((prev) => [...prev, payload.message]);
      }
    });

    const statusSub = subscribe(`/topic/chat/${chatId}/status`, (payload) => {
      console.log('Received STOMP status:', payload);
      if (payload.chatId === chatId) {
        const serverPausedAt = payload.pausedAt ? new Date(payload.pausedAt) : null;
        if (
          lastLocalStatusChangeRef.current &&
          serverPausedAt &&
          serverPausedAt <= lastLocalStatusChangeRef.current
        ) {
          return;
        }
        setChatMeta((m) => ({
          ...m,
          status: payload.status || 'active',
          pausedBy: payload.pausedBy || null,
          pausedAt: serverPausedAt,
        }));
      }
    });

    // Also subscribe to personal queues for better reliability
    const personalMsgSub = subscribe(`/user/${user._id}/queue/messages`, (payload) => {
      console.log('Received personal message:', payload);
      if (payload.chatId === chatId && payload.message) {
        setMessages((prev) => [...prev, payload.message]);
      }
    });

    const personalStatusSub = subscribe(`/user/${user._id}/queue/conversation-status`, (payload) => {
      console.log('Received personal status:', payload);
      if (payload.chatId === chatId) {
        const serverPausedAt = payload.pausedAt ? new Date(payload.pausedAt) : null;
        if (
          lastLocalStatusChangeRef.current &&
          serverPausedAt &&
          serverPausedAt <= lastLocalStatusChangeRef.current
        ) {
          return;
        }
        setChatMeta((m) => ({
          ...m,
          status: payload.status || 'active',
          pausedBy: payload.pausedBy || null,
          pausedAt: serverPausedAt,
        }));
      }
    });

    subscriptionsRef.current = [msgSub, statusSub, personalMsgSub, personalStatusSub];

    return () => {
      // Cleanup subscriptions
      if (msgSub) unsubscribe(`/topic/chat/${chatId}/messages`);
      if (statusSub) unsubscribe(`/topic/chat/${chatId}/status`);
      if (personalMsgSub) unsubscribe(`/user/${user._id}/queue/messages`);
      if (personalStatusSub) unsubscribe(`/user/${user._id}/queue/conversation-status`);
      subscriptionsRef.current = [];
      mounted = false;
    };
  }, [chatId, user?._id, refreshUser]);

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

  // --- Send message ---
  const handleSend = async (e) => {
    e && e.preventDefault();
    const content = newMessage.trim();
    if (!content) return;
    if (chatMeta.status !== 'active') {
      setStatusMessage('Conversation is paused. Resume to send messages.');
      return;
    }

    try {
      const optimistic = {
        _id: `temp-${Date.now()}`,
        text: content,
        sender: { _id: user?._id, displayName: user?.displayName || user?.name },
        timestamp: new Date().toISOString(),
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setNewMessage('');
      if (messageInputRef.current) messageInputRef.current.style.height = 'auto';

      const res = await sendMessage(chatId, content);
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

  // --- Pause/resume ---
  const handlePauseToggle = async () => {
    const now = new Date();
    lastLocalStatusChangeRef.current = now;

    if (chatMeta.status === 'active') {
      setChatMeta((m) => ({ ...m, status: 'paused', pausedBy: user?._id, pausedAt: now }));
      try {
        const res = await pauseChat(chatId);
        setChatMeta((m) => ({
          ...m,
          status: res?.pausedAt ? 'paused' : (res?.status || 'paused'),
          pausedBy: res?.pausedBy || user?._id,
          pausedAt: res?.pausedAt ? new Date(res.pausedAt) : now,
        }));
        await refreshUser();
      } catch (err) {
        setStatusMessage(err.message || 'Failed to pause conversation');
        setChatMeta((m) => ({ ...m, status: 'active', pausedBy: null, pausedAt: null }));
      }
    } else {
      setChatMeta((m) => ({ ...m, status: 'active', pausedBy: null, pausedAt: null }));
      try {
        const res = await resumeChat(chatId);
        setChatMeta((m) => ({ ...m, status: res?.status || 'active', pausedBy: null, pausedAt: null }));
        await refreshUser();
      } catch (err) {
        setStatusMessage(err.message || 'Failed to resume conversation');
        setChatMeta((m) => ({ ...m, status: 'paused', pausedBy: user?._id, pausedAt: now }));
      }
    }
  };

  // --- Copy helper ---
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

  // --- Input handler ---
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(300, ta.scrollHeight)}px`;
  };

  // --- Reporting helpers ---
  const openReportModalForUser = (reportedUserId) => {
    setReportTarget({ reportedUserId, messageId: null, messageText: '', mode: 'user' });
    setReportModalOpen(true);
  };
  const openReportModalForMessage = (reportedUserId, messageId, messageText) => {
    setReportTarget({ reportedUserId, messageId, messageText: messageText || '', mode: 'message' });
    setReportModalOpen(true);
  };
  const closeReportModal = () => {
    setReportModalOpen(false);
    setTimeout(() => setReportTarget({ reportedUserId: null, messageId: null, messageText: '', mode: 'user' }), 200);
  };
  const handleInlineReportSuccess = async () => {
    setStatusMessage('Report submitted — moderators will review it.');
    setTimeout(() => setStatusMessage(''), 4000);
    closeReportModal();
    try { await refreshUser(); } catch {}
  };

  // --- Render ---
  return (
    <main className="container">
      <div className="chat-container-modern">
        {/* --- Modern Header --- */}
        <div className="chat-header-modern">
          <div className="chat-header-left">
            <div className="chat-avatar-section">
              <Avatar size={56} name={chatMeta?.name || 'Conversation'} className="chat-header-avatar" />
              <div className={`status-indicator-modern ${chatMeta.status}`}>
                <div className="status-dot"></div>
              </div>
            </div>
            <div className="chat-header-info">
              <h2 className="chat-title-modern">
                {chatMeta?.name || 'Conversation'}
              </h2>
              <div className="chat-subtitle">
                {chatMeta.status === 'paused' ? (
                  <span className="status-text-modern paused">
                    <span className="status-icon">⏸️</span>
                    Paused conversation
                    {chatMeta.pausedAt && (
                      <span className="pause-time">
                        • {new Date(chatMeta.pausedAt).toLocaleDateString()} at {new Date(chatMeta.pausedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="status-text-modern active">
                    <span className="status-icon">🟢</span>
                    Active conversation
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="chat-header-actions">
            <Button 
              variant="ghost" 
              onClick={handlePauseToggle} 
              aria-pressed={chatMeta.status === 'paused'}
              className={`control-button-modern ${chatMeta.status === 'paused' ? 'resume' : 'pause'}`}
            >
              {chatMeta.status === 'active' ? (
                <>
                  <span className="button-icon">⏸️</span>
                  Pause
                </>
              ) : (
                <>
                  <span className="button-icon">▶️</span>
                  Resume
                </>
              )}
            </Button>

            {partnerId && (
              <div className="report-controls-modern">
                <button
                  type="button"
                  className="action-button-modern quick-report"
                  title="Quick report participant"
                  aria-label="Quick report participant"
                  onClick={() => openReportModalForUser(partnerId)}
                >
                  🚩
                </button>
                <ReportButton 
                  reportedUserId={partnerId} 
                  title="Report conversation participant" 
                  className="report-button-modern"
                />
              </div>
            )}
          </div>
        </div>

        {/* --- Modern Messages --- */}
        <div className="chat-messages-modern" ref={scrollRef}>
          {loading ? (
            <div className="empty-state-modern loading">
              <div className="loading-spinner-modern"></div>
              <p>Loading your conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-icon-modern">💬</div>
              <h3>Start the conversation!</h3>
              <p>Send your first message to begin chatting</p>
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
                  className={`message-container-modern ${mine ? 'mine' : 'theirs'}`}
                >
                  {!mine && (
                    <div className="message-avatar-modern">
                      <Avatar 
                        size={36} 
                        name={sender.name}
                        className="avatar-theirs-modern"
                      />
                    </div>
                  )}

                  <div className="message-content-modern">
                    <div className={`message-bubble-modern ${mine ? 'mine' : 'theirs'}`}>
                      {!mine && (
                        <div className="message-sender-modern">
                          {sender.name}
                        </div>
                      )}

                      <div className="message-text-modern">
                        {m.text}
                      </div>

                      <div className="message-footer-modern">
                        <div className="message-time-modern">{ts}</div>
                        
                        <div className="message-actions-modern">
                          <button 
                            type="button" 
                            className="action-button-modern copy-btn" 
                            title="Copy message"
                            onClick={() => copyToClipboard(m.text || '')}
                          >
                            📋
                          </button>
                          {sender.id && String(sender.id) !== String(user?._id) && (
                            <button
                              type="button"
                              className="action-button-modern report-btn"
                              title="Report message"
                              onClick={() => openReportModalForMessage(sender.id, m._id, m.text)}
                            >
                              🚩
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- Modern Composer --- */}
        <div className="message-composer-modern">
          <form onSubmit={handleSend} className="composer-form">
            <div className="composer-input-wrapper-modern">
              <textarea
                ref={messageInputRef}
                className="message-input-modern"
                placeholder={chatMeta.status === 'active' ? 'Type your message here...' : 'Conversation is paused'}
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={(e) => { 
                  if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    handleSend(); 
                  } 
                }}
                disabled={chatMeta.status !== 'active'}
                rows="1"
              />
              {chatMeta.status !== 'active' && (
                <div className="composer-disabled-overlay-modern">
                  <span className="pause-icon">⏸️</span>
                  <span>Chat is paused</span>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="send-button-modern"
              disabled={chatMeta.status !== 'active' || !newMessage.trim()}
            >
              <span className="send-icon">💬</span>
              Send
            </Button>
          </form>
        </div>

        {/* --- Modern Status Message --- */}
        {statusMessage && (
          <div className={`status-message-modern ${statusMessage.includes('Failed') ? 'error' : 'success'}`} role="status" aria-live="polite">
            <span className="status-icon-modern">
              {statusMessage.includes('Failed') ? '❌' : '✅'}
            </span>
            {statusMessage}
          </div>
        )}

        {/* --- Enhanced Report Modal --- */}
        {reportModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={reportTarget.mode === 'message' ? 'Report message' : 'Report user'}
            tabIndex={-1}
            className="report-modal-modern"
            onClick={(e) => { if (e.target === e.currentTarget) closeReportModal(); }}
          >
            <div className="report-modal-content-modern">
              <div className="report-modal-header-modern">
                <h3>
                  {reportTarget.mode === 'message' ? '🚩 Report Message' : '🚩 Report User'}
                </h3>
                <button 
                  type="button" 
                  className="close-button-modern" 
                  onClick={closeReportModal} 
                  aria-label="Close report form"
                >
                  ✖
                </button>
              </div>

              <ReportForm
                reportedUserId={reportTarget.reportedUserId}
                messageId={reportTarget.messageId}
                onSuccess={handleInlineReportSuccess}
                onCancel={closeReportModal}
                initialDescription={reportTarget.messageText ? `Message content: "${reportTarget.messageText}"` : ''}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Chat;
