// backend/routes/chatRoutes.js

const express = require('express');
const router = express.Router();
const {
  startChat,
  listChats,
  sendMessage,
  pauseChat,
  resumeChat,
  getChatMessages,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// List chats (my inbox)
router.get('/', protect, listChats);

// Start a new chat with a matched user (create-or-get)
router.post('/:userId', protect, startChat);

// Send a message (put this BEFORE :chatId to avoid clash)
router.post('/message/:chatId', protect, sendMessage);

// Pause a chat
router.patch('/:chatId/pause', protect, pauseChat);

// Resume a chat
router.patch('/:chatId/resume', protect, resumeChat);

// Get messages from a chat
router.get('/:chatId', protect, getChatMessages);

module.exports = router;
