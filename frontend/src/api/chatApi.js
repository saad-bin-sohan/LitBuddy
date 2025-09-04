// frontend/src/api/chatApi.js

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001/api';

async function parseJsonSafe(res) {
  try {
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    try {
      return await res.json();
    } catch {
      return {};
    }
  }
}

/**
 * Start (or fetch existing) 1-1 chat with a user
 * POST /api/chat/:userId
 */
export const startChat = async (userId) => {
  const res = await fetch(`${API_URL}/chat/${userId}`, {
    method: 'POST',
    credentials: 'include', // Use cookies instead of Authorization header
  });
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
    
    const res = await fetch(`${API_URL}/chat`, {
      method: 'GET',
      credentials: 'include', // Use cookies instead of Authorization header
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
export const sendMessage = async (chatId, text) => {
  const res = await fetch(`${API_URL}/chat/message/${chatId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Use cookies instead of Authorization header
    body: JSON.stringify({ text }),
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
  const res = await fetch(`${API_URL}/chat/${chatId}/pause`, {
    method: 'PATCH',
    credentials: 'include', // Use cookies instead of Authorization header
  });
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
  const res = await fetch(`${API_URL}/chat/${chatId}/resume`, {
    method: 'PATCH',
    credentials: 'include', // Use cookies instead of Authorization header
  });
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
// Add this function to your chatApi.js
export const getChatMessages = async (chatId) => {
  const res = await fetch(`${API_URL}/chat/${chatId}`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const err = new Error(data.message || 'Failed to fetch chat messages');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
};
