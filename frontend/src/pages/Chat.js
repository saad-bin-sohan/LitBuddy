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
        const msgs = Array.isArray(data) ? data : (data.messages || []);
        if (!mounted) return;
        setMessages(msgs || []);
        if (data.chatMeta) setChatMeta((cm) => ({ ...cm, ...data.chatMeta }));
        else if (data.meta) setChatMeta((cm) => ({ ...cm, ...data.meta }));
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
    <main className="container" style={{ padding: 16 }}>
      <div className="chat-container" style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* --- Header --- */}
        <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="chat-title" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar size={44} name={chatMeta?.name || 'Conversation'} />
            <div>
              <div className="chat-name" style={{ fontWeight: 700 }}>{chatMeta?.name || 'Conversation'}</div>
              <div className="chat-status" style={{ fontSize: 12, color: 'var(--muted)' }}>
                {chatMeta.status === 'paused' ? 'Paused' : 'Active'}
                {chatMeta.pausedAt ? ` — paused at ${new Date(chatMeta.pausedAt).toLocaleString()}` : ''}
              </div>
            </div>
          </div>

          <div className="chat-controls" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className={`status-badge ${chatMeta.status}`} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #eee', fontSize: 12 }}>
              {String(chatMeta.status || '').toUpperCase()}
            </div>

            <Button variant="ghost" onClick={handlePauseToggle} aria-pressed={chatMeta.status === 'paused'}>
              {chatMeta.status === 'active' ? 'Pause Chat' : 'Resume Chat'}
            </Button>

            {partnerId && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ReportButton reportedUserId={partnerId} title="Report conversation participant (full form)" />
                <button
                  type="button"
                  className="icon-btn"
                  title="Quick report participant"
                  aria-label="Quick report participant"
                  onClick={() => openReportModalForUser(partnerId)}
                >
                  🚩
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- Messages --- */}
        <div
          className="chat-messages"
          ref={scrollRef}
          style={{ overflowY: 'auto', maxHeight: '60vh', padding: 12, borderRadius: 8, border: '1px solid #eee', background: 'var(--surface)' }}
        >
          {loading ? (
            <div style={{ padding: 20 }}>Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="empty-state" style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
              No messages yet. Say hello 👋
            </div>
          ) : (
            messages.map((m, idx) => {
              const sender = formatSender(m);
              const mine = sender.id && String(sender.id) === String(user?._id);
              const ts = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const msgKey = m._id || `msg-${idx}`;

              return (
                <div
                  key={msgKey}
                  className={`message-container ${mine ? 'mine' : 'theirs'}`}
                  style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end', flexDirection: mine ? 'row-reverse' : 'row' }}
                >
                  <div style={{ flex: '0 0 auto' }}>
                    <Avatar size={36} name={mine ? 'You' : sender.name} />
                  </div>

                  <div style={{ flex: 1, maxWidth: '78%' }}>
                    <div
                      className={`message-bubble ${mine ? 'mine' : 'theirs'}`}
                      style={{
                        background: mine ? 'linear-gradient(180deg, #E6F7FF, #DFF3FF)' : '#fff',
                        border: '1px solid #eee',
                        padding: 12,
                        borderRadius: 12,
                        boxShadow: 'var(--shadow-1)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="message-sender" style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
                            {mine ? 'You' : sender.name}
                          </div>

                          <div className="message-text" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                            {m.text}
                          </div>
                        </div>

                        <div style={{ marginLeft: 8, textAlign: 'right', minWidth: 70 }}>
                          <div className="message-time" style={{ fontSize: 12, color: 'var(--muted)' }}>{ts}</div>

                          <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                            <button type="button" className="icon-btn" title="Copy" onClick={() => copyToClipboard(m.text || '')}>
                              📋
                            </button>
                            {sender.id && String(sender.id) !== String(user?._id) && (
                              <>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Quick report"
                                  onClick={() => openReportModalForMessage(sender.id, m._id, m.text)}
                                >
                                  🚩
                                </button>
                                <ReportButton reportedUserId={sender.id} messageId={m._id} title="Report (full form)" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* --- Composer --- */}
        <form className="message-composer" onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={messageInputRef}
            className="message-input"
            placeholder={chatMeta.status === 'active' ? 'Type a message…' : 'Conversation is paused'}
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={chatMeta.status !== 'active'}
            rows="1"
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 300,
              resize: 'none',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />

          <Button type="submit" disabled={chatMeta.status !== 'active' || !newMessage.trim()}>
            Send
          </Button>
        </form>

        {statusMessage && (
          <div className="status-message" role="status" aria-live="polite" style={{ marginTop: 8, color: 'var(--muted)' }}>
            {statusMessage}
          </div>
        )}

        {/* --- Inline Report Modal --- */}
        {reportModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={reportTarget.mode === 'message' ? 'Report message' : 'Report user'}
            tabIndex={-1}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              zIndex: 1200,
              padding: 20,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) closeReportModal(); }}
          >
            <div style={{
              width: 'min(920px, 96%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 12,
              padding: 18,
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>
                  {reportTarget.mode === 'message' ? 'Report Message' : 'Report User'}
                </h3>
                <button type="button" className="icon-btn" onClick={closeReportModal} aria-label="Close report form">
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
