const asyncHandler = require('express-async-handler');
const GroupChat = require('../models/groupChatModel');
const ClubMember = require('../models/clubMemberModel');
const BookClub = require('../models/bookClubModel');

/**
 * GET /api/group-chats/:clubId
 * Get all group chats for a club
 */
const getGroupChats = asyncHandler(async (req, res) => {
  const { clubId } = req.params;

  // Verify user is club member
  const membership = await ClubMember.findOne({
    club: clubId,
    user: req.user._id,
    isActive: true
  });

  if (!membership) {
    res.status(403);
    throw new Error('Not a member of this club');
  }

  const chats = await GroupChat.find({
    club: clubId,
    isActive: true
  })
  .populate('participants.user', 'name displayName profilePhotos')
  .populate('createdBy', 'name displayName')
  .sort({ lastActivity: -1 })
  .lean();

  res.json(chats);
});

/**
 * GET /api/group-chats/chat/:chatId
 * Get group chat details and messages
 */
const getGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await GroupChat.findOne({
    _id: chatId,
    isActive: true
  })
  .populate('club', 'name')
  .populate('participants.user', 'name displayName profilePhotos')
  .populate('messages.sender', 'name displayName profilePhotos')
  .lean();

  if (!chat) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  // Verify user is participant
  if (!chat.participants.some(p => p.user._id.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error('Not a participant in this chat');
  }

  res.json(chat);
});

/**
 * POST /api/group-chats/:clubId
 * Create a new group chat
 */
const createGroupChat = asyncHandler(async (req, res) => {
  const { clubId } = req.params;
  const { name, description } = req.body;

  // Verify user is club member
  const membership = await ClubMember.findOne({
    club: clubId,
    user: req.user._id,
    isActive: true
  });

  if (!membership) {
    res.status(403);
    throw new Error('Not a member of this club');
  }

  // Check permissions
  if (!membership.hasPermission('canModerateChat') && membership.role !== 'owner') {
    res.status(403);
    throw new Error('Not authorized to create group chats');
  }

  const chat = await GroupChat.create({
    club: clubId,
    name: name || 'New Discussion',
    description,
    participants: [{
      user: req.user._id,
      role: membership.role
    }],
    createdBy: req.user._id
  });

  const populatedChat = await GroupChat.findById(chat._id)
    .populate('participants.user', 'name displayName profilePhotos')
    .populate('createdBy', 'name displayName');

  res.status(201).json(populatedChat);
});

/**
 * POST /api/group-chats/message/:chatId
 * Send a message to group chat
 */
const sendGroupMessage = asyncHandler(async (req, res) => {
  const upload = require('../middleware/uploadMiddleware');

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

  const chat = await GroupChat.findById(req.params.chatId);

  if (!chat || !chat.isActive) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  // Verify user is participant
  if (!chat.isParticipant(req.user._id)) {
    res.status(403);
    throw new Error('Not a participant in this chat');
  }

  // Prepare attachments metadata if any
  const attachments = (req.savedFiles || []).map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    url: f.url,
  }));

  // Append message
  await chat.appendMessage(req.user._id, hasText ? text.trim() : '', attachments);

  // Update member's activity
  await ClubMember.findOneAndUpdate(
    { club: chat.club, user: req.user._id },
    { lastActivity: new Date() }
  );

  // Update club's activity
  await BookClub.findByIdAndUpdate(chat.club, { lastActivity: new Date() });

  const updatedChat = await GroupChat.findById(chat._id)
    .populate('messages.sender', 'name displayName profilePhotos')
    .populate('participants.user', 'name displayName profilePhotos');

  res.json(updatedChat);
});

/**
 * PUT /api/group-chats/:chatId
 * Update group chat details
 */
const updateGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { name, description } = req.body;

  const chat = await GroupChat.findById(chatId);

  if (!chat || !chat.isActive) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  // Check permissions
  if (!chat.canModerate(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to update this chat');
  }

  if (name !== undefined) chat.name = name;
  if (description !== undefined) chat.description = description;

  await chat.save();

  res.json(chat);
});

/**
 * DELETE /api/group-chats/:chatId
 * Delete group chat (moderators and owners only)
 */
const deleteGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await GroupChat.findById(chatId);

  if (!chat || !chat.isActive) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  // Check permissions
  if (!chat.canModerate(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to delete this chat');
  }

  // Cannot delete the default "General Discussion" chat
  if (chat.name === 'General Discussion') {
    res.status(400);
    throw new Error('Cannot delete the default discussion chat');
  }

  // Soft delete
  chat.isActive = false;
  await chat.save();

  res.json({ message: 'Group chat deleted successfully' });
});

/**
 * POST /api/group-chats/:chatId/participants
 * Add participant to group chat
 */
const addParticipant = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  const chat = await GroupChat.findById(chatId);

  if (!chat || !chat.isActive) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  // Check permissions
  if (!chat.canModerate(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to manage participants');
  }

  // Verify user is club member
  const membership = await ClubMember.findOne({
    club: chat.club,
    user: userId,
    isActive: true
  });

  if (!membership) {
    res.status(400);
    throw new Error('User is not a club member');
  }

  await chat.addParticipant(userId, membership.role);

  const updatedChat = await GroupChat.findById(chat._id)
    .populate('participants.user', 'name displayName profilePhotos');

  res.json(updatedChat);
});

/**
 * DELETE /api/group-chats/:chatId/participants/:userId
 * Remove participant from group chat
 */
const removeParticipant = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.params;

  const chat = await GroupChat.findById(chatId);

  if (!chat || !chat.isActive) {
    res.status(404);
    throw new Error('Group chat not found');
  }

  // Check permissions
  if (!chat.canModerate(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to manage participants');
  }

  // Cannot remove owner from chat
  const participantRole = chat.getParticipantRole(userId);
  if (participantRole === 'owner') {
    res.status(400);
    throw new Error('Cannot remove club owner from chat');
  }

  await chat.removeParticipant(userId);

  res.json({ message: 'Participant removed successfully' });
});

module.exports = {
  getGroupChats,
  getGroupChat,
  createGroupChat,
  sendGroupMessage,
  updateGroupChat,
  deleteGroupChat,
  addParticipant,
  removeParticipant
};
