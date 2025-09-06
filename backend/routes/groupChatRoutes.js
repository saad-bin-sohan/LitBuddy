const express = require('express');
const router = express.Router();
const {
  getGroupChats,
  getGroupChat,
  createGroupChat,
  sendGroupMessage,
  updateGroupChat,
  deleteGroupChat,
  addParticipant,
  removeParticipant
} = require('../controllers/groupChatController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Group chat CRUD routes
router.get('/:clubId', getGroupChats);
router.post('/:clubId', createGroupChat);
router.get('/chat/:chatId', getGroupChat);
router.put('/chat/:chatId', updateGroupChat);
router.delete('/chat/:chatId', deleteGroupChat);

// Message routes
router.post('/message/:chatId', sendGroupMessage);

// Participant management routes
router.post('/chat/:chatId/participants', addParticipant);
router.delete('/chat/:chatId/participants/:userId', removeParticipant);

module.exports = router;
