// backend/controllers/chatController.js

const asyncHandler = require('express-async-handler');
const chatService = require('../services/chatService');
const { getLogger } = require('../utils/logger');

/**
 * POST /api/chat/:userId
 * Start a new chat between matched users (or return existing)
 */
const startChat = asyncHandler(async (req, res) => {
  const otherUserId = req.params.userId;
  const requesterId = req.user._id;

  try {
    const chat = await chatService.createChatBetween(requesterId, otherUserId);
    return res.json(chat);
  } catch (err) {
    if (err && err.status === 403) {
      return res.status(403).json({
        message: err.message || 'Active conversations limit reached',
        blockedFor: err.blockedFor,
        currentCount: err.currentCount,
        maxAllowed: err.maxAllowed,
      });
    }
    if (err && err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

/**
 * GET /api/chat
 * List chats for the authenticated user
 */
const listChats = asyncHandler(async (req, res) => {
  const requestLogger = getLogger(req);
  try {
    requestLogger.debug({ userId: String(req.user && req.user._id) }, 'chat.list_request_received');
    
    // Validate user object
    if (!req.user || !req.user._id) {
      requestLogger.warn('chat.invalid_user_in_request');
      return res.status(400).json({ message: 'Invalid user session' });
    }
    
    const chats = await chatService.listChatsForUser(req.user._id);
    requestLogger.debug({ userId: String(req.user._id), chatCount: chats.length }, 'chat.list_response_ready');
    res.json(chats);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    requestLogger.error({ err }, 'chat.list_controller_failed');
    throw err;
  }
});

/**
 * POST /api/chat/message/:chatId
 * Append a message to chat
 */
const upload = require('../middleware/uploadMiddleware');

const sendMessage = asyncHandler(async (req, res) => {
  // Use upload middleware to handle file uploads (max 5 files)
  await new Promise((resolve, reject) => {
    upload.array('attachments', 5)(req, res, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  const { text } = req.body;

  // Validate text or attachments presence
  const hasText = text && typeof text === 'string' && text.trim();
  const hasFiles = req.savedFiles && req.savedFiles.length > 0;

  if (!hasText && !hasFiles) {
    res.status(400);
    throw new Error('Message text or attachments required');
  }

  // Prepare attachments metadata if any
  const attachments = (req.savedFiles || []).map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    url: f.url,
  }));

  try {
    const message = await chatService.appendMessage(
      req.user._id,
      req.params.chatId,
      hasText ? text.trim() : '',
      attachments
    );
    // Return { message } so the frontend can replace the optimistic message.
    // The frontend handles both { message } and { messages: [] } response shapes.
    res.json({ message });
  } catch (err) {
    if (err && err.status === 409) {
      return res.status(409).json({ message: err.message, status: err.chatStatus });
    }
    if (err && err.status === 403) {
      return res.status(403).json({ message: err.message });
    }
    throw err;
  }
});

/**
 * PATCH /api/chat/:chatId/pause
 */
const pauseChat = asyncHandler(async (req, res) => {
  try {
    const chat = await chatService.pauseChat(req.user._id, req.params.chatId);
    res.json({ message: 'Chat paused', chatId: chat._id, status: chat.status, pausedBy: chat.pausedBy, pausedAt: chat.pausedAt });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

/**
 * PATCH /api/chat/:chatId/resume
 */
const resumeChat = asyncHandler(async (req, res) => {
  try {
    const chat = await chatService.resumeChat(req.user._id, req.params.chatId);
    res.json({ message: 'Chat resumed', chatId: chat._id, status: chat.status });
  } catch (err) {
    if (err && err.status === 403) {
      return res.status(403).json({
        message: err.message || 'Cannot resume — active conversation limit reached',
        blockedFor: err.blockedFor,
        currentCount: err.currentCount,
        maxAllowed: err.maxAllowed,
      });
    }
    if (err && err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

/**
 * GET /api/chat/:chatId
 * Return chat messages (populated senders) — only if requester is a participant
 */
const getChatMessages = asyncHandler(async (req, res) => {
  try {
    const chatData = await chatService.getChatForUser(req.user._id, req.params.chatId);
    // Ensure consistent response structure
    res.json({
      messages: chatData.messages || [],
      status: chatData.status,
      pausedBy: chatData.pausedBy,
      pausedAt: chatData.pausedAt,
      participants: chatData.participants,
      name: chatData.name || `Chat with ${chatData.otherParticipant?.name || 'User'}`
    });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

/**
 * PATCH /api/chat/:chatId/read
 * Mark all messages in this chat as read for the authenticated user.
 * Updates chat.lastReadAt[userId] = now, which is used to compute
 * unreadCount in the inbox (listChatsForUser).
 */
const markAsRead = asyncHandler(async (req, res) => {
  try {
    await chatService.markChatAsRead(req.user._id, req.params.chatId);
    res.json({ success: true });
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

module.exports = {
  startChat,
  listChats,
  sendMessage,
  pauseChat,
  resumeChat,
  getChatMessages,
  markAsRead,
};
