// frontend/src/api/chatApi.js
//
// 2026-09 fix: startChat/sendMessage/pauseChat/resumeChat each built
// their own raw fetch() instead of going through the shared apiFetch()
// helper in ./httpClient, so none of them sent the 'X-Requested-With'
// header backend/middleware/csrfMiddleware.js requires on mutating
// requests -- starting a chat, sending a message, and pausing/resuming a
// chat were all silently rejected with a 403 before reaching the
// controller. markAsRead already had the header added by hand (it was
// the one function in this file fixed after the CSRF middleware shipped)
// -- that manual fix is preserved here, now alongside the others.
//
// Each function's own response-shape/error-message behavior is kept
// exactly as it was; only the transport (fetch -> apiFetch) changed.
// getMyChats keeps its own AbortController timeout, sendMessage keeps
// its FormData body (apiFetch never forces a Content-Type, so the
// browser still sets the correct multipart boundary automatically).

import { apiFetch, parseJsonSafe } from './httpClient';

/**
 * Start (or fetch existing) 1-1 chat with a user
 * POST /api/chat/:userId
 */
export const startChat = async (userId) => {
  const res = await apiFetch(`/chat/${userId}`, { method: 'POST' });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to start chat');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

/**
 * Get my chats list
 * GET /api/chat
 */
export const getMyChats = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const res = await apiFetch('/chat', {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      const err = new Error(data.message || 'Failed to fetch chats');
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return Array.isArray(data) ? data : (data.chats || []);
  } catch (error) {
    if (error.name === 'AbortError') {
      const err = new Error('Request timeout. Please try again.');
      err.status = 408;
      throw err;
    }
    throw error;
  }
};

/**
 * Send message
 * POST /api/chat/message/:chatId
 */
export const sendMessage = async (chatId, text, files = []) => {
  const formData = new FormData();
  if (text) {
    formData.append('text', text);
  }
  if (files && files.length > 0) {
    for (const file of files) {
      formData.append('attachments', file);
    }
  }
  const res = await apiFetch(`/chat/message/${chatId}`, {
    method: 'POST',
    body: formData,
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to send message');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

/**
 * Pause chat
 * PATCH /api/chat/:chatId/pause
 */
export const pauseChat = async (chatId) => {
  const res = await apiFetch(`/chat/${chatId}/pause`, { method: 'PATCH' });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to pause chat');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

/**
 * Resume chat
 * PATCH /api/chat/:chatId/resume
 */
export const resumeChat = async (chatId) => {
  const res = await apiFetch(`/chat/${chatId}/resume`, { method: 'PATCH' });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to resume chat');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

/**
 * Get chat messages
 * GET /api/chat/:chatId
 * Your Chat page expects an array (messages), so we return `data`
 */
export const getChatMessages = async (chatId) => {
  const res = await apiFetch(`/chat/${chatId}`, { method: 'GET' });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to fetch chat messages');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};

/**
 * Mark all messages in a chat as read for the current user.
 * PATCH /api/chat/:chatId/read
 * Fire-and-forget is acceptable — call without await where appropriate.
 */
export const markAsRead = async (chatId) => {
  try {
    const res = await apiFetch(`/chat/${chatId}/read`, { method: 'PATCH' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.message || 'Failed to mark as read');
      err.status = res.status;
      throw err;
    }
    return true;
  } catch (err) {
    // Silently swallow errors — marking as read is non-critical
    console.warn('[Chat] markAsRead failed:', err.message);
    return false;
  }
};
