// backend/controllers/chatController.js

const asyncHandler = require('express-async-handler');
const chatService = require('../services/chatService');

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
    throw err;
  }
});

/**
 * GET /api/chat
 * List chats for the authenticated user
 */
const listChats = asyncHandler(async (req, res) => {
  try {
    const chats = await chatService.listChatsForUser(req.user._id);
    res.json(chats);
  } catch (err) {
    throw err;
  }
});

/**
 * POST /api/chat/message/:chatId
 * Append a message to chat
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400);
    throw new Error('Message text required');
  }

  try {
    const chat = await chatService.appendMessage(req.user._id, req.params.chatId, text.trim());
    res.json(chat);
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

module.exports = {
  startChat,
  listChats,
  sendMessage,
  pauseChat,
  resumeChat,
  getChatMessages,
};
